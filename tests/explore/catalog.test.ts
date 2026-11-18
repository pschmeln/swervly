import { describe, expect, it } from "vitest";
import { CATALOG_COMPANIES } from "@/features/explore/companies";
import {
  CAREER_LINK_CHECKED_ON,
  VERIFIED_CAREER_LINKS,
  careerPageHref,
} from "@/features/explore/links";
import { COMPANY_ROLE_FILTERS, prototypeModel } from "@/features/explore/view-model";
import { MOCK_EXPERIENCES, UNCONSENTED_SAMPLE_MARKER } from "@/features/community/mock/data";
import {
  FORBIDDEN_PROTOTYPE_CLAIM,
  PROTOTYPE_NOTICES,
  addQuestion,
  companiesForRole,
  filterQuestions,
  markPreview,
  noteReport,
  toggleHelpful,
  toggleSaved,
} from "@/features/explore/local-state";

describe("verified career links", () => {
  it("keeps 12 https links on the organization hosts", () => {
    expect(VERIFIED_CAREER_LINKS).toHaveLength(12);
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
    expect(CAREER_LINK_CHECKED_ON).toBe("2026-11-17");
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
  it("covers the checked links once and adds one empty card", () => {
    const linked = CATALOG_COMPANIES.filter((company) => company.careerLinkId);
    const empty = CATALOG_COMPANIES.filter((company) => company.careerLinkId === null);
    expect(linked).toHaveLength(12);
    expect(empty).toHaveLength(1);
    expect(new Set(linked.map((company) => company.careerLinkId)).size).toBe(12);
    expect(empty[0]?.name).toBe("Sample Org With No Page On File");
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

describe("sample consent", () => {
  it("drops experiences that are not marked as shared", () => {
    expect(MOCK_EXPERIENCES.some((item) => item.body.includes(UNCONSENTED_SAMPLE_MARKER))).toBe(true);
    expect(MOCK_EXPERIENCES.some((item) => item.sharingConsent === false)).toBe(true);
    const model = prototypeModel(true);
    expect(model).not.toBeNull();
    const serialized = JSON.stringify(model);
    expect(serialized).not.toContain(UNCONSENTED_SAMPLE_MARKER);
    expect(serialized).not.toContain("Hidden Sample");
    expect(serialized).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    expect(model?.companies.find((company) => company.id === "mayo")?.experienceCount).toBe(0);
    expect(model?.companies.find((company) => company.id === "cchmc")?.experienceCount).toBe(1);
    expect(model?.experiences.map((item) => item.companyName)).toEqual(["Cincinnati Children's"]);
    expect(prototypeModel(false)).toBeNull();
  });
});

describe("local prototype actions", () => {
  it("keeps notices free of publish or moderation claims", () => {
    for (const notice of PROTOTYPE_NOTICES) {
      expect(notice).not.toMatch(FORBIDDEN_PROTOTYPE_CLAIM);
    }
  });

  it("filters, adds, and toggles without a success claim", () => {
    const model = prototypeModel(true);
    if (!model) throw new Error("expected prototype model");
    expect(filterQuestions(model.questions, "company:mayo")).toEqual([]);
    expect(filterQuestions(model.questions, "role:clinical-operations")).toHaveLength(1);
    expect(companiesForRole(model.companies, "No category on file").map((company) => company.id)).toEqual([
      "sample-empty",
    ]);
    expect(companiesForRole(model.companies, "Missing category")).toEqual([]);

    const missing = addQuestion(model.questions, { scopeValue: "role:nope", title: "Hi", body: "Details", id: "x" }, model.scopes);
    expect(missing.ok).toBe(false);
    const added = addQuestion(
      model.questions,
      { scopeValue: "role:finance", title: "  Sample title  ", body: "  Sample details  ", id: "local-1" },
      model.scopes,
    );
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.notice).toBe("Only on this screen. Nothing was sent.");
    expect(added.questions[0]?.localOnly).toBe(true);
    expect(added.questions[0]?.title).toBe("Sample title");

    const marked = toggleHelpful([], "q-clinic-week");
    expect(marked.notice).toBe("Marked on this screen. Not saved.");
    expect(toggleHelpful(marked.ids, "q-clinic-week").notice).toBe("Cleared on this screen. Not saved.");

    const saved = toggleSaved([], "pnc");
    expect(saved.notice).toBe("Kept on this screen. Not saved.");
    expect(toggleSaved(saved.ids, "pnc").notice).toBe("Removed from this screen. Not saved.");

    const badReport = noteReport(model.reports, { id: "r", targetLabel: "A question", reasonValue: "" });
    expect(badReport.ok).toBe(false);
    const report = noteReport(model.reports, { id: "r", targetLabel: "A question", reasonValue: "private" });
    expect(report.ok).toBe(true);
    if (!report.ok) return;
    expect(report.notice).toBe("Noted on this screen. Nothing was sent.");
    expect(report.reports[0]?.reason).toBe("Private information");

    const missingPreview = markPreview(model.reports, "missing", "hidden_on_screen");
    expect(missingPreview.ok).toBe(false);
    const preview = markPreview(model.reports, "report-sample-1", "hidden_on_screen");
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.notice).toBe("Preview only. Nothing was changed for anyone else.");
    expect(preview.reports.find((item) => item.id === "report-sample-1")?.preview).toBe("hidden_on_screen");
  });
});
