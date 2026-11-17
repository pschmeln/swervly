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

/** Genuine answered Yes/Maybe/No only. Unanswered historical rows are excluded. */
export function wouldGoBackSummary(input: {
  yes: number;
  maybe: number;
  no: number;
  major: string;
}): { headline: string; maybeLine: string } {
  const total = input.yes + input.maybe + input.no;
  const who = input.major.trim().length > 0 ? `${input.major} students` : "students";
  if (total === 0) {
    return {
      headline: "Would-you-go-back answers are not available yet",
      maybeLine: "Students still need to confirm that question.",
    };
  }
  return {
    headline: `${input.yes} of ${total} ${who} would go back`,
    maybeLine: `${input.maybe} said maybe`,
  };
}
