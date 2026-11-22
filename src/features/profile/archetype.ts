import { ARCHETYPE_VERSION, ARCHETYPES, type ArchetypeId } from "@/content/archetypes";
import type { Trait } from "@/content/mini-ipip";
import type { TraitScores } from "@/features/profile/scoring";
import { traitBand, traitHeadline } from "@/features/profile/traits";

export type ArchetypeCard = {
  id: ArchetypeId;
  version: number;
  name: string;
  description: string;
  /** Three plain-language trait lines, most distinctive first. */
  traits: string[];
};

/** Neutral point of a 4-20 trait sum. */
const MIDPOINT = 12;

/** Ties go to the earlier trait. Neuroticism is last and only ever appears as "steady". */
const ORDER: readonly Trait[] = ["conscientiousness", "openness", "extraversion", "agreeableness", "neuroticism"];

const POLES: Readonly<Record<Exclude<Trait, "neuroticism">, { high: ArchetypeId; low: ArchetypeId }>> = {
  conscientiousness: { high: "planner", low: "improviser" },
  openness: { high: "explorer", low: "craftsperson" },
  extraversion: { high: "connector", low: "deep-focuser" },
  agreeableness: { high: "team-anchor", low: "straight-shooter" },
};

function byDistinctiveness(scores: TraitScores, traits: readonly Trait[]): Trait[] {
  return [...traits].sort(
    (left, right) =>
      Math.abs(scores[right] - MIDPOINT) - Math.abs(scores[left] - MIDPOINT) || ORDER.indexOf(left) - ORDER.indexOf(right),
  );
}

export function archetypeIdFor(scores: TraitScores): ArchetypeId {
  const naming = (Object.keys(POLES) as (keyof typeof POLES)[]).filter((trait) => traitBand(scores[trait]) !== "middle");
  if (naming.length === 0) return "all-rounder";
  const strongest = byDistinctiveness(scores, naming)[0] as keyof typeof POLES;
  return traitBand(scores[strongest]) === "high" ? POLES[strongest].high : POLES[strongest].low;
}

/**
 * The three most distinctive trait lines for the card. Neuroticism counts only when it
 * is low ("You stay steady when things get tense"); a high score stays off a card that
 * can be shared, though Profile still shows the full private reading.
 */
export function cardTraits(scores: TraitScores): string[] {
  const eligible = ORDER.filter((trait) => trait !== "neuroticism" || traitBand(scores.neuroticism) === "low");
  return byDistinctiveness(scores, eligible)
    .slice(0, 3)
    .map((trait) => traitHeadline(trait, traitBand(scores[trait])));
}

export function archetypeFor(scores: TraitScores): ArchetypeCard {
  const id = archetypeIdFor(scores);
  return { id, version: ARCHETYPE_VERSION, ...ARCHETYPES[id], traits: cardTraits(scores) };
}
