import { QUIZ_ITEMS, TRAITS, type Trait } from "@/content/mini-ipip";

export const VECTOR_VERSION = 2;

export type TraitScores = Record<Trait, number>;

function keyedValue(answer: number, keyed: "forward" | "reverse"): number {
  return keyed === "reverse" ? 6 - answer : answer;
}

/** Sum of the four keyed items. Range is 4–20. A neutral 3 on every item is 12. */
export function scoreMiniIpip(answers: Record<string, number>): TraitScores {
  const scored = {} as TraitScores;
  for (const trait of TRAITS) {
    const total = QUIZ_ITEMS.filter((item) => item.trait === trait).reduce(
      (sum, item) => sum + keyedValue(answers[item.id] ?? 0, item.keyed),
      0,
    );
    scored[trait] = total;
  }
  return scored;
}

/** The 20 item answers, in content order. Raw 1–5, not rescaled. */
export function toProfileVector(answers: Record<string, number>): number[] {
  return QUIZ_ITEMS.map((item) => answers[item.id] ?? 0);
}
