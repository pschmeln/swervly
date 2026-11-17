export const WOULD_RETURN_VALUES = ["yes", "maybe", "no"] as const;

export type WouldReturn = (typeof WOULD_RETURN_VALUES)[number];

export const WOULD_RETURN_OPTIONS: readonly { value: WouldReturn; label: string }[] = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

export function isWouldReturn(value: string): value is WouldReturn {
  return value === "yes" || value === "maybe" || value === "no";
}

/**
 * V1 headline counts co-op experiences (review records), not distinct students.
 * Pass contributorCount separately for the basis line.
 */
export function wouldGoBackSummary(input: {
  yes: number;
  maybe: number;
  no: number;
  contributorCount: number;
}): { headline: string; maybeLine: string; basisLine: string } {
  const total = input.yes + input.maybe + input.no;
  const studentWord = input.contributorCount === 1 ? "student" : "students";
  const reviewWord = total === 1 ? "review" : "reviews";
  return {
    headline: `${input.yes} of ${total} co-op experiences were rated "Would go back".`,
    maybeLine: `${input.maybe} said maybe.`,
    basisLine: `Based on ${total} ${reviewWord} from ${input.contributorCount} ${studentWord}.`,
  };
}
