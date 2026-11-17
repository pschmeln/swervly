import { describe, expect, it } from "vitest";
import { buildDirection, suggestionsFromRules, traitDistance } from "@/features/direction/rules";
import type { TraitScores } from "@/features/profile/scoring";

const balanced: TraitScores = {
  extraversion: 12,
  agreeableness: 12,
  conscientiousness: 12,
  neuroticism: 12,
  openness: 12,
};

describe("direction rules", () => {
  it("returns three labelled suggestions without calling a model", () => {
    const suggestions = suggestionsFromRules({
      traits: { ...balanced, openness: 18, conscientiousness: 16 },
      major: "Computer Science",
      goal: "industry",
    });
    expect(suggestions).toHaveLength(3);
    expect(suggestions.map((item) => item.roleType)).toContain("software");
    expect(suggestions.every((item) => item.reason.length > 0)).toBe(true);
    expect(suggestions.every((item) => item.source === "rules")).toBe(true);
  });

  it("shifts to similar students once three close reviews exist", () => {
    const direction = buildDirection(
      { traits: balanced, major: "Mechanical Engineering", goal: "industry" },
      [
        { traits: balanced, roleType: "design", enjoyment: 5 },
        { traits: { ...balanced, openness: 13 }, roleType: "design", enjoyment: 5 },
        { traits: balanced, roleType: "research", enjoyment: 2 },
      ],
    );
    expect(direction.basis).toBe("similar_students");
    expect(direction.label).toContain("early guess");
    expect(direction.suggestions[0]).toMatchObject({
      roleType: "design",
      reason: "Students with profiles like yours rated this highly.",
    });
    expect(traitDistance(balanced, balanced)).toBe(0);
  });

  it("stays on the rules table when similar reviews are scarce", () => {
    const direction = buildDirection(
      { traits: { ...balanced, openness: 18 }, major: "Mechanical Engineering", goal: "grad_school" },
      [{ traits: balanced, roleType: "design", enjoyment: 5 }],
    );
    expect(direction.basis).toBe("rules");
    expect(direction.suggestions.map((item) => item.roleType)).toContain("research");
  });
});
