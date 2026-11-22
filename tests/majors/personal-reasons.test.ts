import { describe, expect, it, vi } from "vitest";
import { GRAD_MAJORS, INDUSTRY_MAJORS } from "@/content/major-traits";
import { matchCatalog } from "@/features/majors/catalog";
import { academicExploration, majorReason } from "@/features/majors/selection";
import type { TraitScores } from "@/features/profile/scoring";

// These tests cover every major and career, including those hidden from engineering students.
vi.mock("@/lib/audience", () => import("../helpers/audience-all"));

const high: TraitScores = { extraversion: 18, agreeableness: 18, conscientiousness: 18, neuroticism: 12, openness: 18 };
const low: TraitScores = { extraversion: 6, agreeableness: 6, conscientiousness: 6, neuroticism: 12, openness: 6 };
const mixed: TraitScores = { extraversion: 6, agreeableness: 19, conscientiousness: 12, neuroticism: 12, openness: 7 };

function reasons(traits: TraitScores) {
  return academicExploration({ source: "undecided", exploringMajors: false, goal: "industry", traits }).suggestions;
}

describe("personal major reasons", () => {
  it("lists only real catalog majors", () => {
    for (const link of [...INDUSTRY_MAJORS, ...GRAD_MAJORS]) {
      expect(matchCatalog(link.name), link.name).not.toBeNull();
    }
  });

  it("describes each major differently, using the student's own trait result", () => {
    const list = reasons(mixed);
    expect(list).toHaveLength(4);
    expect(new Set(list.map((item) => item.reason)).size).toBe(list.length);
    const nursing = list.find((item) => item.name === "Nursing");
    expect(nursing?.reason).toContain("You look out for the people around you");
    expect(nursing?.reason).toContain("fits how you work");
  });

  it("gives two different students different text for the same major", () => {
    const link = INDUSTRY_MAJORS.find((item) => item.name === "Nursing")!;
    expect(majorReason(link, "Nursing", high).text).not.toBe(majorReason(link, "Nursing", low).text);
    expect(majorReason(link, "Nursing", low).text).toContain("stretch you");
  });

  it("says each trait line once, then refers back to it", () => {
    const list = reasons(mixed);
    const line = "You look out for the people around you";
    expect(list.filter((item) => item.reason.includes(line))).toHaveLength(1);
    expect(list.find((item) => item.name === "Psychology")?.reason).toContain("same strength");
  });

  it("puts majors that fit the student's traits first", () => {
    // High agreeableness, low extraversion and openness: Nursing and Psychology lead.
    expect(reasons(mixed).slice(0, 2).map((item) => item.name)).toEqual(["Nursing", "Psychology"]);
  });

  it("speaks confidently without claiming certainty or a score", () => {
    const result = academicExploration({ source: "undecided", exploringMajors: false, goal: "grad_school", traits: high });
    expect(result.note).toBe("Picked from your goal and matched to your quiz.");
    for (const item of result.suggestions) {
      expect(item.reason.toLowerCase()).not.toMatch(/fit score|proof|proven|guarantee|this is your career|\d+\s*%/);
    }
  });

  it("falls back to the goal text without quiz results", () => {
    const list = academicExploration({ source: "undecided", exploringMajors: false, goal: "industry" }).suggestions;
    expect(list[0]?.reason).toContain("you said your goal is industry work");
  });
});
