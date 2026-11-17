import { describe, expect, it } from "vitest";
import { withoutDismissedRoles } from "@/features/direction/career-roles";
import { buildDirection, suggestionsFromRules } from "@/features/direction/rules";
import type { TraitScores } from "@/features/profile/scoring";

const openAndConscientious: TraitScores = {
  extraversion: 18,
  agreeableness: 16,
  conscientiousness: 18,
  neuroticism: 6,
  openness: 18,
};

const ENGINEERING_ROLES = [
  "design",
  "test_validation",
  "manufacturing_process",
  "software",
  "field_site",
] as const;

function expectNoFitClaim(value: unknown) {
  const text = JSON.stringify(value);
  expect(text).not.toMatch(/\d+\s*%/);
  expect(text.toLowerCase()).not.toContain("validated suitability");
}

describe("direction outside engineering", () => {
  it("does not give a nursing student engineering roles from quiz scores", () => {
    const suggestions = suggestionsFromRules({
      traits: openAndConscientious,
      major: "Nursing",
      goal: "industry",
    });
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.map((item) => item.roleType)).toContain("healthcare_clinical");
    for (const role of ENGINEERING_ROLES) {
      expect(suggestions.map((item) => item.roleType)).not.toContain(role);
    }
    expect(suggestions.every((item) => item.source === "rules")).toBe(true);
    expect(suggestions.every((item) => item.evidenceLabel === "Early hypothesis")).toBe(true);
    expectNoFitClaim(suggestions);
  });

  it("keeps similar-student engineering evidence off non-engineering majors", () => {
    const direction = buildDirection(
      { traits: openAndConscientious, major: "Nursing", goal: "industry" },
      [
        { userId: "a", traits: openAndConscientious, roleType: "software", enjoyment: 5 },
        { userId: "b", traits: openAndConscientious, roleType: "software", enjoyment: 5 },
        { userId: "c", traits: openAndConscientious, roleType: "software", enjoyment: 5 },
      ],
    );
    expect(direction.basis).toBe("rules");
    expect(direction.suggestions.every((item) => item.source === "rules")).toBe(true);
    expect(direction.suggestions.map((item) => item.roleType)).not.toContain("software");
    expect(direction.label.toLowerCase()).not.toContain("quiz");
    expectNoFitClaim(direction);
  });

  it("does not invent roles for undecided or legacy Other", () => {
    for (const major of ["", "Other"]) {
      const direction = buildDirection(
        { traits: openAndConscientious, major, goal: "industry" },
        [],
      );
      expect(direction.suggestions.map((item) => item.roleType)).toEqual(["insufficient"]);
      expect(direction.label.toLowerCase()).toContain("not a career-fit score");
      expect(direction.suggestions[0]?.source).toBe("rules");
      expect(direction.suggestions[0]?.evidenceLabel).toBe("Not enough information");
    }
  });

  it("still separates an evidence-backed engineering role from a hypothesis", () => {
    const direction = buildDirection(
      { traits: openAndConscientious, major: "Mechanical Engineering", goal: "industry" },
      [
        { userId: "a", traits: openAndConscientious, roleType: "design", enjoyment: 5 },
        { userId: "b", traits: openAndConscientious, roleType: "design", enjoyment: 5 },
        { userId: "c", traits: openAndConscientious, roleType: "design", enjoyment: 4 },
      ],
    );
    expect(direction.suggestions[0]?.source).toBe("similar_students");
    expect(direction.suggestions[0]?.evidenceLabel).toContain("n=3");
    const hypothesis = direction.suggestions.find((item) => item.source === "rules");
    if (hypothesis) expect(hypothesis.evidenceLabel).toBe("Early hypothesis");
  });

  it("drops a dismissed role without refilling it", () => {
    const suggestions = suggestionsFromRules({
      traits: openAndConscientious,
      major: "Business Administration",
      goal: "industry",
    });
    const hidden = withoutDismissedRoles(suggestions, ["business_operations"]);
    expect(suggestions.map((item) => item.roleType)).toContain("business_operations");
    expect(hidden.map((item) => item.roleType)).not.toContain("business_operations");
    expect(hidden.map((item) => item.roleType)).not.toContain("software");
  });
});