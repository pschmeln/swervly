import { describe, expect, it } from "vitest";
import { courseworkEntries, joinParts, majorPart, REASON_KIND_LABEL } from "@/features/direction/explain";
import { DATA, DESIGN, FIELD, PROCESS, RESEARCH_MAJORS, SOFTWARE } from "@/features/direction/rule-data";
import { buildDirection, type SimilarReview } from "@/features/direction/rules";
import type { TraitScores } from "@/features/profile/scoring";

const MIDDLE: TraitScores = { extraversion: 12, agreeableness: 12, conscientiousness: 12, neuroticism: 12, openness: 12 };
const BANDS = [6, 12, 18];
const PROFILES: TraitScores[] = [];
for (const extraversion of BANDS)
  for (const agreeableness of BANDS)
    for (const conscientiousness of BANDS)
      for (const neuroticism of BANDS)
        for (const openness of BANDS) PROFILES.push({ extraversion, agreeableness, conscientiousness, neuroticism, openness });

const MAJORS = ["Electrical Engineering", "Computer Science", "Mechanical Engineering", "Chemical Engineering", "Civil Engineering", "Industrial & Systems Engineering"];

describe("major line (V1-07)", () => {
  it("names the coursework instead of asserting a direct major fit", () => {
    expect(majorPart("Electrical Engineering", "software")).toEqual({
      kind: "major",
      text: "Electrical Engineering coursework includes programming, digital logic and embedded systems, which software work builds on.",
    });
  });

  it("falls back to a confident plain line when Swervly has no coursework for the pair", () => {
    expect(majorPart("Environmental Engineering", "software").text).toBe("Environmental Engineering is a common path into software work.");
  });

  it("only lists coursework for a major the matching rule can actually fire for", () => {
    const sets: Record<string, ReadonlySet<string>> = {
      software: SOFTWARE,
      design: DESIGN,
      manufacturing_process: PROCESS,
      data_analytics: DATA,
      field_site: FIELD,
      research: RESEARCH_MAJORS,
    };
    for (const [major, role] of courseworkEntries()) {
      expect(sets[role]?.has(major), `${major} / ${role}`).toBe(true);
    }
  });
});

describe("Direction suggestions carry their sources", () => {
  it("splits an EE student's software suggestion into its major line, with no student-review claim", () => {
    const direction = buildDirection({ traits: MIDDLE, major: "Electrical Engineering", goal: "industry" }, []);
    const software = direction.suggestions.find((item) => item.roleType === "software");
    expect(software?.parts.map((part) => part.kind)).toEqual(["major"]);
    expect(software?.parts[0]?.text).toContain("digital logic");
    expect(software?.reason).not.toContain("lines up directly");
  });

  it("keeps student evidence in its own line, labeled as reviews", () => {
    const reviews: SimilarReview[] = [
      { userId: "a", traits: MIDDLE, roleType: "design", enjoyment: 5 },
      { userId: "b", traits: MIDDLE, roleType: "design", enjoyment: 4 },
    ];
    const direction = buildDirection({ traits: MIDDLE, major: "Mechanical Engineering", goal: "industry" }, reviews);
    const evidence = direction.suggestions.find((item) => item.source === "similar_students");
    expect(evidence?.parts).toEqual([{ kind: "reviews", text: evidence?.reason }]);
    for (const item of direction.suggestions.filter((suggestion) => suggestion.source === "rules")) {
      expect(item.parts.some((part) => part.kind === "reviews")).toBe(false);
    }
  });

  it("puts the goal in its own line", () => {
    const traits = { ...MIDDLE, openness: 18 };
    const direction = buildDirection({ traits, major: "Computer Science", goal: "grad_school" }, []);
    const research = direction.suggestions.find((item) => item.roleType === "research");
    expect(research?.parts.find((part) => part.kind === "goal")?.text).toBe("Graduate school is your goal.");
  });

  it("always has at least one line, labels every kind, and reason is the lines joined", () => {
    for (const major of MAJORS) {
      for (const traits of PROFILES) {
        for (const goal of ["industry", "grad_school", "undecided"] as const) {
          for (const item of buildDirection({ traits, major, goal }, []).suggestions) {
            expect(item.parts.length).toBeGreaterThan(0);
            expect(item.reason).toBe(joinParts(item.parts));
            for (const part of item.parts) {
              expect(REASON_KIND_LABEL[part.kind]).toBeTruthy();
              expect(part.text.trim().length).toBeGreaterThan(0);
              // Quiz lines describe the student's answers, never their major.
              if (part.kind === "quiz") expect(part.text).not.toMatch(/major/i);
            }
          }
        }
      }
    }
  });
});
