import { describe, expect, it } from "vitest";
import {
  FALLBACK_EVIDENCE_LABEL,
  fillReason,
  RULES_EVIDENCE_LABEL,
  suggestionsFromRules,
} from "@/features/direction/rules";
import type { TraitScores } from "@/features/profile/scoring";

const middle: TraitScores = {
  extraversion: 12,
  agreeableness: 12,
  conscientiousness: 12,
  neuroticism: 12,
  openness: 12,
};

const QUIZ_OR_MAJOR = /\byou\b|\byour\b|quiz|matched|top matches/i;

describe("fill reasons stay role-neutral", () => {
  it("never claims a quiz or major match for fill / fallback engineering roles", () => {
    const roles = [
      "design",
      "test_validation",
      "software",
      "manufacturing_process",
      "data_analytics",
      "research",
      "field_site",
    ] as const;
    for (const role of roles) {
      const reason = fillReason(role);
      expect(reason, role).not.toMatch(QUIZ_OR_MAJOR);
      expect(reason.toLowerCase(), role).toContain("solid place to start");
    }
  });

  it("labels CS fills as a place to start with neutral copy (Manufacturing, Research, Field, …)", () => {
    const suggestions = suggestionsFromRules(
      { traits: middle, major: "Computer Science", goal: "industry" },
      ["software", "data_analytics", "test_validation"],
    );
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.every((item) => item.evidenceLabel === FALLBACK_EVIDENCE_LABEL)).toBe(true);
    for (const item of suggestions) {
      expect(item.reason).not.toMatch(QUIZ_OR_MAJOR);
      expect(item.evidenceLabel).not.toBe(RULES_EVIDENCE_LABEL);
    }
    expect(suggestions.map((item) => item.roleType)).toEqual(
      expect.arrayContaining(["manufacturing_process", "research"]),
    );
  });
});
