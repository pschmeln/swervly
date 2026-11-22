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
 * Counts students, not reviews (Stage 0 P12): each student counts once, by the answer on their
 * latest co-op at the company (highest rotation number). One student with three co-ops there
 * no longer counts three times.
 */
export function wouldGoBackByStudent(
  reviews: readonly { userId: string; wouldReturn: WouldReturn; rotationNumber: number }[],
): { students: number; yes: number; maybe: number; no: number; percentYes: number } {
  const latest = new Map<string, { wouldReturn: WouldReturn; rotationNumber: number }>();
  for (const review of reviews) {
    const current = latest.get(review.userId);
    if (!current || review.rotationNumber > current.rotationNumber) latest.set(review.userId, review);
  }
  const answers = [...latest.values()].map((entry) => entry.wouldReturn);
  const yes = answers.filter((answer) => answer === "yes").length;
  const maybe = answers.filter((answer) => answer === "maybe").length;
  const no = answers.filter((answer) => answer === "no").length;
  const students = answers.length;
  return { students, yes, maybe, no, percentYes: students === 0 ? 0 : Math.round((100 * yes) / students) };
}

/**
 * Headline and basis lines for a company group. `groupLabel` names the students, for example
 * "Electrical Engineering" ("Based on 3 Electrical Engineering students") or null for all majors.
 */
export function wouldGoBackSummary(input: {
  yes: number;
  maybe: number;
  students: number;
  percentYes: number;
  reviewCount: number;
  groupLabel: string | null;
}): { headline: string; maybeLine: string; basisLine: string } {
  const studentWord = input.students === 1 ? "student" : "students";
  const who = input.groupLabel ? `${input.groupLabel} ${studentWord}` : `${studentWord} across all majors`;
  const reviews = input.reviewCount === input.students ? "" : ` (${input.reviewCount} reviews)`;
  return {
    headline: `${input.percentYes}% would go back: ${input.yes} of ${input.students} ${studentWord} said yes.`,
    maybeLine: `${input.maybe} said maybe.`,
    basisLine: `Based on ${input.students} ${who}${reviews}.`,
  };
}
