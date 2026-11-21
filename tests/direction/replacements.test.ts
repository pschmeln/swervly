import { describe, expect, it } from "vitest";
import { EXTRA_CAREER_ROLE_IDS } from "@/features/direction/career-roles";
import {
  buildDirection,
  DIRECTION_EXHAUSTED_LABEL,
  suggestionsFromRules,
  type DirectionContext,
} from "@/features/direction/rules";
import type { TraitScores } from "@/features/profile/scoring";
import { ROLE_TYPE_VALUES } from "@/features/review/roles";

const curious: TraitScores = { extraversion: 12, agreeableness: 12, conscientiousness: 16, neuroticism: 10, openness: 18 };
const peopleFirst: TraitScores = { extraversion: 18, agreeableness: 18, conscientiousness: 12, neuroticism: 8, openness: 12 };
const middle: TraitScores = { extraversion: 12, agreeableness: 12, conscientiousness: 12, neuroticism: 12, openness: 12 };

const EVERY_ROLE = [...ROLE_TYPE_VALUES, ...EXTRA_CAREER_ROLE_IDS.filter((role) => role !== "insufficient")];

const contexts: { name: string; context: DirectionContext }[] = [
  { name: "engineering", context: { traits: curious, major: "Mechanical Engineering", goal: "industry" } },
  { name: "computing", context: { traits: curious, major: "Computer Science", goal: "industry" } },
  { name: "major family outside engineering", context: { traits: peopleFirst, major: "Nursing", goal: "industry" } },
  { name: "business family (three roles)", context: { traits: peopleFirst, major: "Business Administration", goal: "industry" } },
  { name: "undecided (quiz only)", context: { traits: peopleFirst, major: "", goal: "undecided" } },
];

const roles = (items: readonly { roleType: string }[]) => items.map((item) => item.roleType);

describe("Not for me replaces a suggestion with the next best", () => {
  it.each(contexts)("$name: dismissing nothing changes nothing", ({ context }) => {
    expect(buildDirection(context, [], [])).toEqual(buildDirection(context, []));
    expect(suggestionsFromRules(context, [])).toEqual(suggestionsFromRules(context));
  });

  it.each(contexts)("$name: the dismissed role is gone and the others move up", ({ context }) => {
    const before = roles(buildDirection(context, []).suggestions);
    expect(before.length).toBeGreaterThan(1);
    const [first, ...rest] = before;
    const after = roles(buildDirection(context, [], [first]).suggestions);
    expect(after).not.toContain(first);
    // Everything else that was shown is still shown, and the list does not shrink.
    // (Outside engineering the major's own roles keep the first two slots, so order can shift.)
    for (const role of rest) expect(after).toContain(role);
    expect(after.length).toBeGreaterThanOrEqual(before.length - 1);
  });

  it.each(contexts.filter((item) => item.name !== "undecided (quiz only)"))(
    "$name: a replacement appears when another role fits",
    ({ context }) => {
      const before = roles(buildDirection(context, []).suggestions);
      const after = roles(buildDirection(context, [], [before[0]]).suggestions);
      expect(after).toHaveLength(before.length);
    },
  );

  it("fills the empty slot so an engineering student still sees three", () => {
    const context = contexts[0].context;
    const before = roles(buildDirection(context, []).suggestions);
    expect(before).toHaveLength(3);
    const after = roles(buildDirection(context, [], [before[0]]).suggestions);
    expect(after).toHaveLength(3);
    expect(new Set(after).size).toBe(3);
  });

  it("keeps filling as more roles are dismissed, one at a time", () => {
    const context = contexts[0].context;
    const dismissed: string[] = [];
    let previous = roles(buildDirection(context, []).suggestions);
    while (previous.length > 0) {
      dismissed.push(previous[0]);
      const next = buildDirection(context, [], dismissed);
      for (const role of dismissed) expect(roles(next.suggestions)).not.toContain(role);
      previous = roles(next.suggestions);
    }
    expect(dismissed.length).toBeGreaterThan(3);
  });

  it.each(contexts)("$name: dismissing everything says so plainly, with no 'not enough information' card", ({ context }) => {
    const direction = buildDirection(context, [], EVERY_ROLE);
    expect(direction.suggestions).toEqual([]);
    expect(direction.exhausted).toBe(true);
    expect(direction.label).toBe(DIRECTION_EXHAUSTED_LABEL);
  });

  it("still says 'not enough information' when nothing was dismissed and nothing fits", () => {
    const direction = buildDirection({ traits: middle, major: "", goal: "industry" }, []);
    expect(direction.exhausted).toBe(false);
    expect(roles(direction.suggestions)).toEqual(["insufficient"]);
  });

  it("never brings back a dismissed role through student evidence", () => {
    const context = contexts[0].context;
    const reviews = [
      { userId: "a", traits: curious, roleType: "design" as const, enjoyment: 5 },
      { userId: "b", traits: curious, roleType: "design" as const, enjoyment: 5 },
    ];
    expect(buildDirection(context, reviews).suggestions[0]).toMatchObject({ roleType: "design", source: "similar_students" });
    const after = buildDirection(context, reviews, ["design"]);
    expect(roles(after.suggestions)).not.toContain("design");
    expect(after.suggestions.length).toBeGreaterThan(0);
  });
});
