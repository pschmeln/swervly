import { describe, expect, it, vi } from "vitest";
import { CAREER_LINK_CHECKS } from "@/content/career-link-checks";
import { COMPANIES } from "@/content/companies";
import { EMPLOYERS_SEED } from "@/content/employers-seed";
import { atlasGraph } from "@/features/atlas/graph";
import { hostMatches, isJobBoard } from "@/features/companies/link-check";
import { EXTRA_CAREER_ROLE_IDS, isCareerRoleId } from "@/features/direction/career-roles";
import { CATALOG_COMPANIES } from "@/features/explore/companies";
import { normalizeEmployerName } from "@/features/review/normalize";

// These tests cover every major and career, including those hidden from engineering students.
vi.mock("@/lib/audience", () => import("../helpers/audience-all"));

const graph = atlasGraph();

describe("the company list", () => {
  it("gives every company a unique, stable slug id", () => {
    const ids = COMPANIES.map((company) => company.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });

  it("never lets two companies, or an alias and another company, normalize to the same name", () => {
    const owner = new Map<string, string>();
    for (const company of COMPANIES) {
      const key = normalizeEmployerName(company.name);
      expect(owner.has(key), `${company.name} collides with ${owner.get(key)}`).toBe(false);
      owner.set(key, company.id);
    }
    for (const company of COMPANIES) {
      for (const alias of company.aliases) {
        const holder = owner.get(normalizeEmployerName(alias));
        if (holder) expect(holder, `alias "${alias}" of ${company.id}`).toBe(company.id);
      }
    }
  });

  it("uses only real role ids and career map families", () => {
    for (const company of COMPANIES) {
      for (const role of company.roleTypes) {
        expect(isCareerRoleId(role), `${company.id}: ${role}`).toBe(true);
        expect(role).not.toBe("other");
        expect(role).not.toBe(EXTRA_CAREER_ROLE_IDS.at(-1));
      }
      for (const family of company.families) expect(graph.nodes.get(family)?.level, `${company.id}: ${family}`).toBe("family");
    }
  });

  it("asks for https careers URLs that are never job boards", () => {
    // hostSuffix is checked on the final URL after redirects (jobs.kroger.com ends on
    // krogerfamilycareers.com), so the requested host need not match it.
    for (const company of COMPANIES) {
      if (!company.careers) continue;
      const url = new URL(company.careers.url);
      expect(url.protocol, company.id).toBe("https:");
      expect(isJobBoard(url.host), company.id).toBe(false);
      expect(isJobBoard(company.careers.hostSuffix), company.id).toBe(false);
    }
  });

  it("records only checks for companies on file, with their own domain when accepted", () => {
    const byId = new Map(COMPANIES.map((company) => [company.id, company]));
    for (const check of CAREER_LINK_CHECKS) {
      const company = byId.get(check.companyId);
      expect(company?.careers, check.companyId).toBeTruthy();
      expect(check.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (!check.accepted) continue;
      expect(check.httpStatus).toBe(200);
      expect(check.finalUrl?.startsWith("https://")).toBe(true);
      expect(hostMatches(check.finalHost ?? "", company?.careers?.hostSuffix ?? "")).toBe(true);
    }
  });

  it("offers every directory company in the co-op form", () => {
    const seeded = new Set(EMPLOYERS_SEED.map((employer) => normalizeEmployerName(employer.name)));
    expect(EMPLOYERS_SEED).toHaveLength(COMPANIES.length);
    for (const company of CATALOG_COMPANIES) expect(seeded.has(normalizeEmployerName(company.name)), company.id).toBe(true);
  });

  it("keeps the employers already seeded, so the next seed run updates rows instead of duplicating them", () => {
    const names = new Set(COMPANIES.map((company) => normalizeEmployerName(company.name)));
    for (const name of ["GE Aerospace", "Honda", "Siemens Digital Industries Software", "Cincinnati Children’s Hospital Medical Center", "Ohio Department of Transportation"]) {
      expect(names.has(normalizeEmployerName(name)), name).toBe(true);
    }
  });
});
