import { describe, expect, it } from "vitest";
import { COMPANIES } from "@/content/companies";
import { DOMAINS, FAMILIES, SPECIALIZATIONS } from "@/content/atlas/taxonomy";
import { buildDirection } from "@/features/direction/rules";
import { CATALOG_COMPANIES } from "@/features/explore/companies";
import { atlasGraph, ATLAS_DATA } from "@/features/atlas/graph";
import { matchCatalog, searchMajors, UNDECIDED_LABEL } from "@/features/majors/catalog";
import type { TraitScores } from "@/features/profile/scoring";
import { AUDIENCE, audienceRules, showsRole } from "@/lib/audience";

const peopleFirst: TraitScores = { extraversion: 18, agreeableness: 18, conscientiousness: 12, neuroticism: 8, openness: 12 };

describe("engineering audience", () => {
  it("is the live audience", () => {
    expect(AUDIENCE).toBe("engineering");
  });

  it("offers engineering and computing majors only, but still recognizes the rest", () => {
    const names = searchMajors("").map((major) => major.name);
    expect(names).toContain("Mechanical Engineering");
    expect(names).toContain("Computer Science");
    expect(names).not.toContain("Nursing");
    expect(searchMajors("nursing")).toEqual([]);
    expect(matchCatalog("Nursing")?.name).toBe("Nursing");
  });

  it("keeps founder-approved student-submitted majors visible", () => {
    const extra = { name: "Mechatronics", category: "Student-submitted", aliases: [] };
    expect(searchMajors("mechatronics", { extraMajors: [extra] }).map((major) => major.name)).toEqual(["Mechatronics"]);
  });

  it("shows engineering careers and common exits, and hides the rest", () => {
    const graph = atlasGraph();
    for (const id of ["fam:electronics-hardware", "fam:software-engineering", "fam:finance", "spec:circuit-hardware", "spec:technical-writing"]) {
      expect(graph.nodes.has(id as never)).toBe(true);
    }
    for (const id of ["fam:clinical-care", "fam:law-justice", "fam:teaching-advising", "spec:journalism", "spec:physician", "dom:society", "dom:education"]) {
      expect(graph.nodes.has(id as never)).toBe(false);
    }
  });

  it("leaves no dangling edges in the student graph", () => {
    const graph = atlasGraph();
    for (const [parent, children] of graph.children) {
      expect(graph.nodes.has(parent)).toBe(true);
      for (const child of children) expect(graph.nodes.has(child)).toBe(true);
    }
    for (const spec of graph.data.specializations) expect(spec.families.length).toBeGreaterThan(0);
    for (const links of Object.values(graph.data.majorLinks)) {
      for (const link of links) expect(graph.nodes.has(link.family)).toBe(true);
    }
  });

  it("keeps every career in the source data", () => {
    expect(ATLAS_DATA.domains).toBe(DOMAINS);
    expect(ATLAS_DATA.families).toBe(FAMILIES);
    expect(ATLAS_DATA.specializations).toBe(SPECIALIZATIONS);
  });

  it("never suggests a hidden role, even from the quiz alone", () => {
    const result = buildDirection({ traits: peopleFirst, major: UNDECIDED_LABEL, goal: "undecided" }, []);
    for (const suggestion of result.suggestions) expect(showsRole(suggestion.roleType)).toBe(true);
  });

  it("lists no company whose families are all hidden", () => {
    const shown = new Set(CATALOG_COMPANIES.map((company) => company.id));
    const rules = audienceRules("engineering");
    for (const company of COMPANIES) {
      if (shown.has(company.id)) expect(rules.showsCompany(company)).toBe(true);
    }
  });

  it("brings everything back when the audience is all", () => {
    const all = audienceRules("all");
    expect(all.showsMajorCategory("Healthcare & Life Sciences")).toBe(true);
    expect(all.showsFamily("fam:clinical-care")).toBe(true);
    expect(all.showsRole("teaching")).toBe(true);
    expect(SPECIALIZATIONS.every(all.showsSpecialization)).toBe(true);
  });
});
