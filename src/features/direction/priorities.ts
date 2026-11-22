import { z } from "zod";

/**
 * "Pick up to 3 things that matter most in a co-op" (item 20, D8). Each maps to something a
 * co-op review records, so a reason can quote a real average from real reviews.
 */
export const PRIORITY_IDS = ["mentorship", "learning", "enjoyment", "clarity", "pay", "would_return"] as const;
export type Priority = (typeof PRIORITY_IDS)[number];
export const MAX_PRIORITIES = 3;

export const PRIORITY_LABELS: Record<Priority, string> = {
  mentorship: "Mentorship",
  learning: "Learning",
  enjoyment: "Enjoying the work",
  clarity: "Clarity about what's next",
  pay: "Pay",
  would_return: "A co-op I'd go back to",
};

export const PRIORITY_OPTIONS = PRIORITY_IDS.map((id) => ({ value: id, label: PRIORITY_LABELS[id] }));

export const PrioritiesInput = z
  .array(z.enum(PRIORITY_IDS))
  .max(MAX_PRIORITIES, { error: `Pick up to ${MAX_PRIORITIES}.` })
  .refine((values) => new Set(values).size === values.length, { error: "Pick each one once." });

/** Stored values to known priorities, in the order chosen; unknown values are dropped. */
export function readPriorities(stored: readonly string[] | null | undefined): Priority[] {
  const known = new Set<string>(PRIORITY_IDS);
  return [...new Set((stored ?? []).filter((value): value is Priority => known.has(value)))].slice(0, MAX_PRIORITIES);
}
