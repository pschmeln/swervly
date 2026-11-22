import { describe, expect, it, vi } from "vitest";
import { QUIZ_INTRO } from "@/content/mini-ipip";
import { INDUSTRY_MAJORS, GRAD_MAJORS } from "@/content/major-traits";
import {
  buildDirection,
  DIRECTION_EVIDENCE_LABEL,
  DIRECTION_INSUFFICIENT_LABEL,
  DIRECTION_QUIZ_LABEL,
  DIRECTION_RULES_LABEL,
  type SimilarReview,
} from "@/features/direction/rules";
import { academicExploration } from "@/features/majors/selection";
import type { TraitScores } from "@/features/profile/scoring";
import { ATLAS_BANNER } from "@/features/atlas/view";

// These tests cover every major and career, including those hidden from engineering students.
vi.mock("@/lib/audience", () => import("../helpers/audience-all"));

/**
 * Founder rule for fit copy (Nov 21, 2026):
 * - confident about how the student's own answers fit (no hedges that undercut it)
 * - no certainty ("proven", "guaranteed", "this is your career")
 * - nothing about what other students do unless it carries a count and a number
 */
const HEDGES = /early hypothes|best guess|is a guess|not a fit score|not a career-fit score|not proof|career diagnosis|exploratory|not a prediction/i;
// "You like proven methods" describes the student, so only "proven" about fit counts.
const CERTAINTY = /proven (?:fit|match|to)|guarantee|this is your career|you will (?:love|thrive)|perfect fit/i;
const PEOPLE_CLAIM = /\b(students|people|others)\b[^.]*\b(like you|with your profile|near yours|thrive|tend to|rated)\b/i;

const BANDS = [6, 12, 18];
const PROFILES: TraitScores[] = [];
for (const extraversion of BANDS)
  for (const agreeableness of BANDS)
    for (const conscientiousness of BANDS)
      for (const neuroticism of BANDS)
        for (const openness of BANDS) PROFILES.push({ extraversion, agreeableness, conscientiousness, neuroticism, openness });

const MAJORS = ["", "Other", "Mechanical Engineering", "Computer Science", "Nursing", "Business Administration", "Economics", "English", "Biology", "Psychology", "Elementary Education", "Mathematics"];

function sentences(text: string): string[] {
  return text.split(/(?<=\.)\s+/).filter(Boolean);
}

function checkCopy(text: string) {
  expect(text, text).not.toMatch(HEDGES);
  expect(text, text).not.toMatch(CERTAINTY);
  for (const sentence of sentences(text)) {
    if (PEOPLE_CLAIM.test(sentence)) expect(sentence, sentence).toMatch(/\d/);
  }
}

describe("fit copy", () => {
  it("keeps every Direction label confident and free of certainty claims", () => {
    for (const label of [DIRECTION_RULES_LABEL, DIRECTION_EVIDENCE_LABEL, DIRECTION_QUIZ_LABEL, DIRECTION_INSUFFICIENT_LABEL, QUIZ_INTRO, ATLAS_BANNER]) {
      checkCopy(label);
    }
  });

  it("follows the rule for every suggestion, across 243 quiz profiles and 12 majors", () => {
    for (const major of MAJORS) {
      for (const traits of PROFILES) {
        for (const goal of ["industry", "grad_school", "undecided"] as const) {
          const direction = buildDirection({ traits, major, goal }, []);
          checkCopy(direction.label);
          for (const item of direction.suggestions) checkCopy(item.reason);
        }
      }
    }
  });

  it("only talks about other students with the count and the average", () => {
    const traits = PROFILES[121];
    const reviews: SimilarReview[] = [
      { userId: "a", traits, roleType: "design", enjoyment: 5 },
      { userId: "b", traits, roleType: "design", enjoyment: 4 },
    ];
    const direction = buildDirection({ traits, major: "Mechanical Engineering", goal: "industry" }, reviews);
    const evidence = direction.suggestions.find((item) => item.source === "similar_students");
    expect(evidence?.reason).toBe("2 students with profiles like yours rated co-ops in this role 4.5/5 for enjoyment.");
    checkCopy(evidence?.reason ?? "");
  });

  it("follows the rule for suggested majors", () => {
    expect(INDUSTRY_MAJORS.length + GRAD_MAJORS.length).toBeGreaterThan(0);
    for (const traits of PROFILES) {
      for (const goal of ["industry", "grad_school"] as const) {
        const result = academicExploration({ source: "undecided", exploringMajors: false, goal, traits });
        checkCopy(result.note);
        for (const item of result.suggestions) checkCopy(item.reason);
      }
    }
  });
});
