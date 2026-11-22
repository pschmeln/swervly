import { wouldGoBackByStudent, type WouldReturn } from "@/features/review/would-return";
import { PRIORITY_LABELS, type Priority } from "./priorities";

/** A shared review of a co-op in some role, from a consenting student in the viewer's group of majors. */
export type RoleReview = {
  userId: string;
  roleType: string;
  rotationNumber: number;
  enjoyment: number;
  learning: number;
  mentorship: number;
  clarityGained: number;
  wouldReturn: WouldReturn;
  payHourly: number | null;
};

/** Distinct students before a priority statistic is shown (ground rule 5). */
export const MIN_PRIORITY_STUDENTS = 2;
/** Pay needs 3, as on company pages (D5). */
export const MIN_PRIORITY_PAY_STUDENTS = 3;
/** At most this many reasons per suggestion. */
export const MAX_REASONS = 3;

const RATING_FIELD = {
  mentorship: "mentorship",
  learning: "learning",
  enjoyment: "enjoyment",
  clarity: "clarityGained",
} as const;

const RATING_NOUN = {
  mentorship: "mentorship",
  learning: "learning",
  enjoyment: "enjoyment",
  clarity: "clarity about what's next",
} as const;

function students(reviews: readonly RoleReview[]): number {
  return new Set(reviews.map((review) => review.userId)).size;
}

/**
 * One sentence for a priority the student chose, from real reviews of this role, or null when
 * there are too few students. Always states the average or share and how many students.
 */
export function priorityReason(priority: Priority, reviews: readonly RoleReview[]): string | null {
  const label = PRIORITY_LABELS[priority];
  if (priority === "pay") {
    const reporters = reviews.filter((review) => typeof review.payHourly === "number" && Number.isFinite(review.payHourly));
    const n = students(reporters);
    if (n < MIN_PRIORITY_PAY_STUDENTS) return null;
    const pays = reporters.map((review) => review.payHourly as number);
    const low = Math.floor(Math.min(...pays));
    const high = Math.ceil(Math.max(...pays));
    const range = low === high ? `$${low}/hr` : `$${low}–$${high}/hr`;
    return `You chose ${label} as a top priority. ${n} students in majors like yours reported ${range} in this role.`;
  }
  const n = students(reviews);
  if (n < MIN_PRIORITY_STUDENTS) return null;
  if (priority === "would_return") {
    const goBack = wouldGoBackByStudent(reviews);
    return `You chose "${label}" as a top priority. ${goBack.percentYes}% of ${goBack.students} students in majors like yours would go back to their co-op in this role.`;
  }
  const field = RATING_FIELD[priority];
  const mean = reviews.reduce((sum, review) => sum + review[field], 0) / reviews.length;
  return `You chose ${label} as a top priority. ${n} students in majors like yours rated ${RATING_NOUN[priority]} in this role ${mean.toFixed(1)}/5.`;
}

/**
 * 1–3 reasons for a role suggestion: the rule or evidence reason first, then one sentence per
 * chosen priority that real reviews of this role can back. Nothing is invented: a priority with
 * too few students simply adds no reason.
 */
export function whyMatched(
  baseReason: string,
  roleType: string,
  priorities: readonly Priority[],
  reviews: readonly RoleReview[],
): string[] {
  const forRole = reviews.filter((review) => review.roleType === roleType);
  const reasons = [baseReason];
  for (const priority of priorities) {
    if (reasons.length >= MAX_REASONS) break;
    const line = priorityReason(priority, forRole);
    if (line) reasons.push(line);
  }
  return reasons;
}
