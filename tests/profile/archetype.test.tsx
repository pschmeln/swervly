import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ARCHETYPE_IDS, ARCHETYPES } from "@/content/archetypes";
import { archetypeFor, archetypeIdFor, cardTraits } from "@/features/profile/archetype";
import { ArchetypeCard } from "@/features/profile/components/archetype-card";
import type { TraitScores } from "@/features/profile/scoring";
import { traitHeadline } from "@/features/profile/traits";

const middle: TraitScores = { extraversion: 12, agreeableness: 12, conscientiousness: 12, neuroticism: 12, openness: 12 };
const STRESS_LINES = [traitHeadline("neuroticism", "high"), traitHeadline("neuroticism", "middle")];

function* everyProfile(): Generator<TraitScores> {
  const range = Array.from({ length: 17 }, (_, index) => index + 4);
  for (const extraversion of range)
    for (const agreeableness of range)
      for (const conscientiousness of range)
        for (const openness of range)
          for (const neuroticism of [4, 10, 12, 15, 20]) yield { extraversion, agreeableness, conscientiousness, openness, neuroticism };
}

describe("work-style archetype", () => {
  it("has 8 to 12 archetypes, each with a name and a one-line description", () => {
    expect(ARCHETYPE_IDS.length).toBeGreaterThanOrEqual(8);
    expect(ARCHETYPE_IDS.length).toBeLessThanOrEqual(12);
    for (const id of ARCHETYPE_IDS) {
      expect(ARCHETYPES[id].name.length).toBeGreaterThan(0);
      expect(ARCHETYPES[id].description).toMatch(/^[^.]+\.$/);
    }
  });

  it("gives every possible quiz result a card with 3 different traits, never a stress line, and reaches every archetype", () => {
    const seen = new Set<string>();
    const problems: string[] = [];
    for (const scores of everyProfile()) {
      const card = archetypeFor(scores);
      seen.add(card.id);
      const bad =
        card.traits.length !== 3 ||
        new Set(card.traits).size !== 3 ||
        STRESS_LINES.some((line) => card.traits.includes(line));
      if (bad && problems.length < 5) problems.push(JSON.stringify({ scores, traits: card.traits }));
    }
    expect(problems).toEqual([]);
    expect([...seen].sort()).toEqual([...ARCHETYPE_IDS].sort());
  }, 60_000);

  it("is deterministic: same answers, same card", () => {
    const scores: TraitScores = { extraversion: 9, agreeableness: 14, conscientiousness: 18, neuroticism: 7, openness: 16 };
    expect(archetypeFor({ ...scores })).toEqual(archetypeFor({ ...scores }));
  });

  it("names the strongest of the four traits outside the middle band, never neuroticism", () => {
    expect(archetypeIdFor({ ...middle, conscientiousness: 19, openness: 16 })).toBe("planner");
    expect(archetypeIdFor({ ...middle, conscientiousness: 15, openness: 20 })).toBe("explorer");
    expect(archetypeIdFor({ ...middle, extraversion: 5 })).toBe("deep-focuser");
    expect(archetypeIdFor({ ...middle, agreeableness: 6 })).toBe("straight-shooter");
    expect(archetypeIdFor({ ...middle, neuroticism: 20 })).toBe("all-rounder");
    expect(archetypeIdFor({ ...middle, neuroticism: 4 })).toBe("all-rounder");
    // Equal distance: conscientiousness wins the tie.
    expect(archetypeIdFor({ ...middle, conscientiousness: 17, openness: 7 })).toBe("planner");
  });

  it("shows steadiness only when neuroticism is low", () => {
    const steady = cardTraits({ ...middle, neuroticism: 4 });
    expect(steady).toContain(traitHeadline("neuroticism", "low"));
    expect(cardTraits({ ...middle, neuroticism: 20 })).not.toContain(traitHeadline("neuroticism", "high"));
  });

  it("renders the name, description and three traits", () => {
    const card = archetypeFor({ extraversion: 18, agreeableness: 15, conscientiousness: 12, neuroticism: 10, openness: 13 });
    const html = renderToStaticMarkup(<ArchetypeCard card={card} justFinished />);
    expect(html).toContain("Your work style");
    expect(html).toContain(card.name);
    expect(html).toContain(card.description.replace("'", "&#x27;"));
    expect(html.match(/<li/g)).toHaveLength(3);
    expect(html).toContain("Retake it any time and this card updates.");
  });
});
