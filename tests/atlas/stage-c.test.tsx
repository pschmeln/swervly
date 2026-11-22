import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { COMPANY_FAMILIES, COMPANY_NOTE } from "@/content/atlas/company-links";
import { AtlasExplorer } from "@/features/atlas/components/atlas-explorer";
import { atlasEntry } from "@/features/atlas/entry";
import { atlasGraph } from "@/features/atlas/graph";
import { rankSpecializations, type Signals } from "@/features/atlas/rank";
import { companiesFor, compareModel, familiesAbove } from "@/features/atlas/view";
import { CATALOG_COMPANIES } from "@/features/explore/companies";
import { careerPageHref } from "@/features/explore/links";
import { FORBIDDEN_PROTOTYPE_CLAIM } from "@/features/explore/local-state";

const graph = atlasGraph();
// Career links expire 90 days after their check; pin "today" so this test does not.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

const quiet: Signals = { answers: {}, interested: [], dismissed: [], directionInterested: [], directionDismissed: [] };

describe("organizations in the map", () => {
  it("links only real directory organizations to real families", () => {
    const ids = new Set(CATALOG_COMPANIES.map((company) => company.id));
    for (const [companyId, families] of Object.entries(COMPANY_FAMILIES)) {
      expect(ids.has(companyId), companyId).toBe(true);
      for (const familyId of families) expect(graph.nodes.get(familyId)?.level, familyId).toBe("family");
    }
  });

  it("uses only careers links from the verified allowlist", () => {
    for (const node of graph.nodes.values()) {
      for (const company of companiesFor(graph, node.id)) {
        if (company.careersUrl) expect(careerPageHref(company.careersUrl)).toBe(company.careersUrl);
      }
    }
  });

  it("shows hospitals for a nursing occupation and never the invented placeholder", () => {
    const names = companiesFor(graph, "occ:onet:29-1141.00").map((company) => company.name);
    expect(names).toContain("Cincinnati Children's Hospital Medical Center");
    expect(names).not.toContain("Sample Org With No Page On File");
  });

  it("never claims anyone is hiring", () => {
    expect(COMPANY_NOTE).toContain("doesn't mean they're hiring");
    const text = JSON.stringify([...graph.nodes.values()].map((node) => companiesFor(graph, node.id)));
    expect(text).not.toMatch(FORBIDDEN_PROTOTYPE_CLAIM);
  });

  it("finds the families above an occupation through every specialization", () => {
    expect(familiesAbove(graph, "occ:onet:17-2199.08")).toEqual(
      expect.arrayContaining(["fam:design-development", "fam:manufacturing-automation", "fam:software-engineering"]),
    );
  });
});

describe("compare two occupations", () => {
  it("lines up two occupations and names what they share", () => {
    const model = compareModel(graph, "occ:onet:17-2141.00", "occ:onet:17-2199.08");
    expect(model?.left.title).toBe("Mechanical Engineers");
    expect(model?.right.title).toBe("Robotics Engineers");
    expect(model?.sharedSoftware).toContain("Dassault Systemes SolidWorks");
    expect(model?.left.tasks.length).toBeLessThanOrEqual(3);
    expect(model?.left.preparation).toContain("bachelor's degree");
  });

  it("refuses the same occupation twice, or anything that is not an occupation", () => {
    expect(compareModel(graph, "occ:onet:17-2141.00", "occ:onet:17-2141.00")).toBeNull();
    expect(compareModel(graph, "fam:finance", "occ:onet:17-2141.00")).toBeNull();
  });

  it("renders side by side, with a clear button on each side and a close button", () => {
    const entry = atlasEntry(graph, { major: "Nursing", majorSource: "catalog" });
    const html = renderToStaticMarkup(
      <AtlasExplorer entry={entry} dismissedRoles={[]} initialFocus={null} initialCompare={["occ:onet:29-1141.00", "occ:onet:29-1171.00"]} />,
    );
    expect(html).toContain("Compare occupations");
    expect(html).toContain("Registered Nurses");
    expect(html).toContain("Nurse Practitioners");
    expect(html).toContain('aria-label="Clear Registered Nurses"');
    expect(html).toContain('aria-label="Clear Nurse Practitioners"');
    expect(html).toContain(">Close<");
  });
});

describe("Direction carry-over and co-op evidence", () => {
  const me = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });

  it("adds one point for an area Direction currently suggests, with a reason", () => {
    const ranked = rankSpecializations(graph, me, { ...quiet, directionSuggested: ["test_validation"] });
    const item = ranked.find((row) => row.id === "spec:test-validation");
    expect(item?.reasons).toContain("It's in an area Direction currently suggests for you.");
  });

  it("uses student evidence only at n >= 2, and says it is about the broad area", () => {
    const withTwo = rankSpecializations(graph, me, { ...quiet, evidence: [{ role: "test_validation", roleLabel: "Test/Validation", sampleSize: 2 }] });
    const withOne = rankSpecializations(graph, me, { ...quiet, evidence: [{ role: "test_validation", roleLabel: "Test/Validation", sampleSize: 1 }] });
    const two = withTwo.find((row) => row.id === "spec:test-validation");
    const one = withOne.find((row) => row.id === "spec:test-validation");
    expect(two?.reasons.some((reason) => reason.startsWith("2 students with quiz profiles near yours"))).toBe(true);
    expect(two?.reasons.some((reason) => reason.includes("not this specialization"))).toBe(true);
    expect((two?.points ?? 0) - (one?.points ?? 0)).toBe(1);
  });

  it("does not double-count Interested and suggested for the same area", () => {
    const both = rankSpecializations(graph, me, { ...quiet, directionInterested: ["test_validation"], directionSuggested: ["test_validation"] });
    const interested = rankSpecializations(graph, me, { ...quiet, directionInterested: ["test_validation"] });
    expect(both.find((row) => row.id === "spec:test-validation")?.points).toBe(interested.find((row) => row.id === "spec:test-validation")?.points);
  });
});
