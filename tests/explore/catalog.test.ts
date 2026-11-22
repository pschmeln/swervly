import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { CAREER_LINK_CHECKS } from "@/content/career-link-checks";
import { CATALOG_COMPANIES } from "@/features/explore/companies";
import { COMPANIES } from "@/content/companies";
import {
  VERIFIED_CAREER_LINKS,
  careerPageHref,
} from "@/features/explore/links";
import { buildExploreModel, COMPANY_ROLE_FILTERS } from "@/features/explore/view-model";
import { FORBIDDEN_PROTOTYPE_CLAIM } from "@/lib/copy-rules";

// These tests cover every major and career, including those hidden from engineering students.
vi.mock("@/lib/audience", () => import("../helpers/audience-all"));

// Career links expire 90 days after their check; pin "today" so this test does not.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

describe("verified career links", () => {
  it("keeps every accepted check as an https link on the organization's host", () => {
    expect(VERIFIED_CAREER_LINKS).toHaveLength(CAREER_LINK_CHECKS.filter((check) => check.accepted).length);
    expect(VERIFIED_CAREER_LINKS.length).toBeGreaterThan(150);
    const finals = new Set<string>();
    for (const link of VERIFIED_CAREER_LINKS) {
      expect(link.httpStatus).toBe(200);
      expect(link.finalUrl.startsWith("https://")).toBe(true);
      expect(finals.has(link.finalUrl)).toBe(false);
      finals.add(link.finalUrl);
      expect(careerPageHref(link.finalUrl)).toBe(link.finalUrl);
      const host = new URL(link.finalUrl).host;
      expect(host).toBe(link.finalHost);
      expect(host === link.hostSuffix || host.endsWith(`.${link.hostSuffix}`)).toBe(true);
      expect(host).not.toMatch(/linkedin\.com|indeed\.com|greenhouse\.io|lever\.co/);
      if (link.requestedUrl !== link.finalUrl) {
        expect(careerPageHref(link.requestedUrl)).toBeNull();
      }
    }
    expect(VERIFIED_CAREER_LINKS.every((link) => link.checkedOn === "2026-11-21")).toBe(true);
  });

  it("stops showing a link 90 days after its check", () => {
    const link = VERIFIED_CAREER_LINKS[0];
    expect(careerPageHref(link.finalUrl, new Date("2027-02-19T12:00:00Z"))).toBe(link.finalUrl);
    expect(careerPageHref(link.finalUrl, new Date("2027-02-20T12:00:00Z"))).toBeNull();
  });

  it("rejects anything that is not an exact checked URL", () => {
    const rejected = [
      "",
      "   ",
      "http://jobs.mayoclinic.org/",
      "https://jobs.mayoclinic.org.evil.com/",
      "https://user:pass@jobs.mayoclinic.org/",
      "https://www.epa.gov/careers/extra",
      "https://jobs.mayoclinic.org",
      "javascript:alert(1)",
      "data:text/html,hi",
      "https://evil.example/careers",
      "https://jobs.mayoclinic.org/?q=1",
    ];
    for (const input of rejected) {
      expect(careerPageHref(input)).toBeNull();
    }
  });
});

describe("company catalog", () => {
  it("lists exactly the companies with a checked careers page, and no placeholder", () => {
    const linked = CATALOG_COMPANIES.filter((company) => company.careerLinkId);
    expect(linked).toHaveLength(CATALOG_COMPANIES.length);
    expect(linked).toHaveLength(VERIFIED_CAREER_LINKS.length);
    expect(new Set(linked.map((company) => company.careerLinkId)).size).toBe(VERIFIED_CAREER_LINKS.length);
    expect(CATALOG_COMPANIES.some((company) => /sample|placeholder/i.test(company.name))).toBe(false);
    // Every directory company is also an employer the co-op form offers.
    const companyIds = new Set(COMPANIES.map((company) => company.id));
    for (const company of CATALOG_COMPANIES) expect(companyIds.has(company.id)).toBe(true);
    const fields = new Set(linked.map((company) => company.field));
    expect(fields.size).toBeGreaterThanOrEqual(8);
    expect([...fields].every((field) => /engineering/i.test(field))).toBe(false);
    for (const company of CATALOG_COMPANIES) {
      expect(company.whyShown).not.toMatch(FORBIDDEN_PROTOTYPE_CLAIM);
      for (const role of company.roleCategories) {
        expect(COMPANY_ROLE_FILTERS).toContain(role);
      }
    }
  });
});

describe("company directory model", () => {
  it("has no sample or invented content, and every company has a role filter", () => {
    const model = buildExploreModel();
    const serialized = JSON.stringify(model);
    expect(serialized).not.toMatch(/sample|invented|placeholder/i);
    expect(serialized).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    const finance = model.companies.filter((company) => company.roleCategories.includes("Finance"));
    expect(finance.map((company) => company.id)).toEqual(expect.arrayContaining(["cleveland-fed", "pnc"]));
  });
});
