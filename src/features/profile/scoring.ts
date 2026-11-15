import { INTEREST_ITEMS, type RiasecScale } from "@/content/interest-items";

export const VECTOR_VERSION = 1;

const SCALES = ["R", "I", "A", "S", "E", "C"] as const satisfies readonly RiasecScale[];

function meanToTwoDecimals(values: number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(2));
}

export function scoreRiasec(
  answers: Record<string, number>,
): Record<RiasecScale, number> {
  const scored = {} as Record<RiasecScale, number>;
  for (const scale of SCALES) {
    const values = INTEREST_ITEMS.filter((item) => item.scale === scale).map(
      (item) => answers[item.id],
    );
    scored[scale] = meanToTwoDecimals(values);
  }
  return scored;
}

export function toProfileVector(answers: Record<string, number>): number[] {
  return INTEREST_ITEMS.map((item) => (answers[item.id] - 3) / 2);
}
