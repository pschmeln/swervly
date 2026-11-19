import { describe, expect, it } from "vitest";
import {
  buildDirection,
  evidenceBackedRoles,
  MIN_DISTINCT_STUDENTS_PER_ROLE,
  MIN_MEAN_ENJOYMENT,
  suggestionsFromRules,
  traitDistance,
} from "@/features/direction/rules";
import type { TraitScores } from "@/features/profile/scoring";

const balanced: TraitScores = {
  extraversion: 12,
  agreeableness: 12,
  conscientiousness: 12,
  neuroticism: 12,
  openness: 12,
};

describe("direction rules", () => {
  it("returns three labelled early hypotheses without calling a model", () => {
    const suggestions = suggestionsFromRules({
      traits: { ...balanced, openness: 18, conscientiousness: 16 },
      major: "Computer Science",
      goal: "industry",
    });
    expect(suggestions).toHaveLength(3);
    expect(suggestions.map((item) => item.roleType)).toContain("software");
    expect(suggestions.every((item) => item.reason.length > 0)).toBe(true);
    expect(suggestions.every((item) => item.source === "rules")).toBe(true);
    expect(suggestions.every((item) => item.evidenceLabel === "Early hypothesis")).toBe(true);
    expect(suggestions[0]?.reason).toContain("Early hypothesis:");
  });

  it("stays on rules when three close reviews span unrelated roles", () => {
    const direction = buildDirection(
      { traits: balanced, major: "Mechanical Engineering", goal: "industry" },
      [
        { userId: "a", traits: balanced, roleType: "design", enjoyment: 5 },
        { userId: "b", traits: { ...balanced, openness: 13 }, roleType: "software", enjoyment: 5 },
        { userId: "c", traits: balanced, roleType: "research", enjoyment: 2 },
      ],
    );
    expect(direction.basis).toBe("rules");
    expect(direction.label).toContain("Worth exploring");
    expect(direction.label).toContain("early hypotheses");
    expect(direction.suggestions.every((item) => item.source === "rules")).toBe(true);
  });

  it("ignores repeated reviews from the same student for evidence", () => {
    const direction = buildDirection(
      { traits: balanced, major: "Mechanical Engineering", goal: "industry" },
      [
        { userId: "a", traits: balanced, roleType: "design", enjoyment: 5 },
        { userId: "a", traits: balanced, roleType: "design", enjoyment: 4 },
        { userId: "a", traits: balanced, roleType: "design", enjoyment: 5 },
      ],
    );
    // Three reviews, one student: below the 2-student minimum.
    expect(direction.basis).toBe("rules");
    expect(MIN_DISTINCT_STUDENTS_PER_ROLE).toBe(2);
  });

  it("uses evidence once 2 different similar students reviewed a role", () => {
    const direction = buildDirection(
      { traits: balanced, major: "Mechanical Engineering", goal: "industry" },
      [
        { userId: "a", traits: balanced, roleType: "design", enjoyment: 5 },
        { userId: "b", traits: balanced, roleType: "design", enjoyment: 5 },
      ],
    );
    expect(direction.suggestions[0]).toMatchObject({ roleType: "design", source: "similar_students", sampleSize: 2 });
  });

  it("never shows a role as evidence when similar students rated it low", () => {
    const reviews = [
      { userId: "a", traits: balanced, roleType: "software" as const, enjoyment: 1 },
      { userId: "b", traits: balanced, roleType: "software" as const, enjoyment: 1 },
    ];
    expect(evidenceBackedRoles(balanced, reviews)).toEqual([]);
    const direction = buildDirection({ traits: balanced, major: "Electrical Engineering", goal: "industry" }, reviews);
    expect(direction.suggestions.some((item) => item.source === "similar_students")).toBe(false);
    expect(direction.basis).toBe("rules");
  });

  it("needs an average of at least MIN_MEAN_ENJOYMENT, not every rating", () => {
    expect(MIN_MEAN_ENJOYMENT).toBe(4);
    const at = (left: number, right: number) =>
      evidenceBackedRoles(balanced, [
        { userId: "a", traits: balanced, roleType: "design", enjoyment: left },
        { userId: "b", traits: balanced, roleType: "design", enjoyment: right },
      ]);
    expect(at(5, 3)).toHaveLength(1); // average 4
    expect(at(4, 3)).toHaveLength(0); // average 3.5
  });

  it("marks a role evidence-backed only with enough distinct similar students", () => {
    const direction = buildDirection(
      { traits: balanced, major: "Mechanical Engineering", goal: "industry" },
      [
        { userId: "a", traits: balanced, roleType: "design", enjoyment: 5 },
        { userId: "b", traits: { ...balanced, openness: 13 }, roleType: "design", enjoyment: 5 },
        { userId: "c", traits: balanced, roleType: "design", enjoyment: 4 },
        { userId: "d", traits: balanced, roleType: "research", enjoyment: 2 },
      ],
    );
    expect(direction.basis === "similar_students" || direction.basis === "mixed").toBe(true);
    expect(direction.suggestions[0]).toMatchObject({
      roleType: "design",
      source: "similar_students",
      sampleSize: 3,
    });
    expect(direction.suggestions[0]?.reason).toContain("Worth exploring");
    expect(direction.suggestions[0]?.reason).toContain("not proof");
    expect(direction.suggestions[0]?.evidenceLabel).toContain("n=3");
    expect(traitDistance(balanced, balanced)).toBe(0);
  });

  it("stays on the rules table when similar reviews are scarce", () => {
    const direction = buildDirection(
      { traits: { ...balanced, openness: 18 }, major: "Mechanical Engineering", goal: "grad_school" },
      [{ userId: "a", traits: balanced, roleType: "design", enjoyment: 5 }],
    );
    expect(direction.basis).toBe("rules");
    expect(direction.suggestions.map((item) => item.roleType)).toContain("research");
  });
});
