import { describe, expect, it } from "vitest";
import { withoutDismissedRoles } from "@/features/direction/career-roles";
import { buildDirection, RULES_EVIDENCE_LABEL, suggestionsFromRules } from "@/features/direction/rules";
import type { TraitScores } from "@/features/profile/scoring";

const openAndConscientious: TraitScores = {
  extraversion: 18,
  agreeableness: 16,
  conscientiousness: 18,
  neuroticism: 6,
  openness: 18,
};

const middle: TraitScores = { extraversion: 12, agreeableness: 12, conscientiousness: 12, neuroticism: 12, openness: 12 };

const peopleFirst: TraitScores = { extraversion: 18, agreeableness: 18, conscientiousness: 12, neuroticism: 8, openness: 12 };

const quietPlanner: TraitScores = { extraversion: 8, agreeableness: 12, conscientiousness: 18, neuroticism: 8, openness: 12 };

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
    expect(suggestions.every((item) => item.evidenceLabel === RULES_EVIDENCE_LABEL)).toBe(true);
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
    expect(direction.label.toLowerCase()).toContain("based on your quiz and your major");
    expectNoFitClaim(direction);
  });

  it("does not give a nursing student the engineering research role for graduate school", () => {
    const suggestions = suggestionsFromRules({
      traits: openAndConscientious,
      major: "Nursing",
      goal: "grad_school",
    });
    expect(suggestions.map((item) => item.roleType)).toContain("healthcare_clinical");
    expect(suggestions.map((item) => item.roleType)).not.toContain("research");
    for (const role of ENGINEERING_ROLES) {
      expect(suggestions.map((item) => item.roleType)).not.toContain(role);
    }
  });

  it("suggests computing work for information technology without engineering fillers", () => {
    const direction = buildDirection(
      { traits: openAndConscientious, major: "Information Technology", goal: "industry" },
      [
        { userId: "a", traits: openAndConscientious, roleType: "manufacturing_process", enjoyment: 5 },
        { userId: "b", traits: openAndConscientious, roleType: "manufacturing_process", enjoyment: 5 },
        { userId: "c", traits: openAndConscientious, roleType: "manufacturing_process", enjoyment: 5 },
      ],
    );
    expect(direction.basis).toBe("rules");
    expect(direction.suggestions.map((item) => item.roleType)).toContain("software");
    expect(direction.suggestions.map((item) => item.roleType)).not.toContain("manufacturing_process");
    expect(direction.suggestions.map((item) => item.roleType)).not.toContain("design");
    expect(direction.suggestions.map((item) => item.roleType)).not.toContain("test_validation");
    expect(direction.suggestions.map((item) => item.roleType)).not.toContain("field_site");
    expect(direction.suggestions.every((item) => item.source === "rules")).toBe(true);
  });

  it("suggests roles from the quiz alone for undecided or legacy Other", () => {
    for (const major of ["", "Other"]) {
      const direction = buildDirection({ traits: openAndConscientious, major, goal: "industry" }, []);
      expect(direction.suggestions).toHaveLength(3);
      expect(direction.suggestions.map((item) => item.roleType)).not.toContain("insufficient");
      expect(direction.label.toLowerCase()).toContain("based on your quiz");
      expect(direction.label.toLowerCase()).not.toContain("major");
      expect(direction.suggestions.every((item) => item.source === "rules")).toBe(true);
      expect(direction.suggestions.every((item) => item.reason.length > 0)).toBe(true);
      expectNoFitClaim(direction);
    }
  });

  it("never uses the engineering catch-all as a quiz signal for undecided students", () => {
    const direction = buildDirection({ traits: middle, major: "", goal: "industry" }, []);
    expect(direction.suggestions.map((item) => item.roleType)).toEqual(["insufficient"]);
    expect(direction.label.toLowerCase()).toContain("no role stands out");
  });

  it("lets the quiz change undecided suggestions", () => {
    const people = suggestionsFromRules({ traits: peopleFirst, major: "", goal: "industry" }).map((item) => item.roleType);
    const quiet = suggestionsFromRules({ traits: quietPlanner, major: "", goal: "industry" }).map((item) => item.roleType);
    expect(people).not.toEqual(quiet);
  });

  it("lets the quiz order a nursing student's roles", () => {
    const people = suggestionsFromRules({ traits: peopleFirst, major: "Nursing", goal: "industry" }).map((item) => item.roleType);
    const quiet = suggestionsFromRules({ traits: quietPlanner, major: "Nursing", goal: "industry" }).map((item) => item.roleType);
    expect(people[0]).toBe("healthcare_clinical");
    expect(quiet[0]).toBe("healthcare_admin");
  });

  it("fills the last slot from the quiz with a non-engineering role only", () => {
    const suggestions = suggestionsFromRules({ traits: peopleFirst, major: "Nursing", goal: "industry" });
    expect(suggestions).toHaveLength(3);
    const third = suggestions[2];
    expect(["healthcare_clinical", "healthcare_admin"]).not.toContain(third.roleType);
    expect(third.reason).toContain("outside your major's usual paths");
    for (const role of [...ENGINEERING_ROLES, "research", "data_analytics"]) {
      expect(suggestions.map((item) => item.roleType)).not.toContain(role);
    }
  });

  it("keeps a major's own two roles when the quiz points nowhere", () => {
    const suggestions = suggestionsFromRules({ traits: middle, major: "Nursing", goal: "industry" });
    expect(suggestions.map((item) => item.roleType)).toEqual(["healthcare_clinical", "healthcare_admin"]);
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
    expect(direction.suggestions[0]?.evidenceLabel).toBe("Backed by 3 students");
    const fromRules = direction.suggestions.find((item) => item.source === "rules");
    if (fromRules) expect(fromRules.evidenceLabel).toBe(RULES_EVIDENCE_LABEL);
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