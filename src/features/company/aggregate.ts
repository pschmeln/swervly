import { wouldGoBackSummary, type WouldReturn } from "@/features/review/would-return";

/** Minimum distinct authorized students before a major aggregate is shown. */
export const MIN_DISTINCT_CONTRIBUTORS = 2;
/**
 * Minimum distinct authorized students who reported pay before a pay range is shown.
 * 3, not 2 (founder decision, Nov 21, 2026): with two reporters the range is
 * both figures, so each student could read the other's pay.
 */
export const MIN_DISTINCT_PAY_CONTRIBUTORS = 3;

/** @deprecated Use MIN_DISTINCT_CONTRIBUTORS. Kept for older imports during transition. */
export const MIN_REVIEWS_TO_SHOW = MIN_DISTINCT_CONTRIBUTORS;
/** @deprecated Use MIN_DISTINCT_PAY_CONTRIBUTORS. */
export const MIN_PAY_REPORTS = MIN_DISTINCT_PAY_CONTRIBUTORS;

export type ReviewForAggregate = {
  userId: string;
  major: string;
  wouldReturn: WouldReturn;
  enjoyment: number;
  learning: number;
  mentorship: number;
  clarityGained: number;
  skillsUsed: string[];
  payHourly: number | null;
  freeText: string | null;
  shareFreeText: boolean;
};

export type PublicMajorView = {
  visible: boolean;
  major: string;
  reviewCount: number;
  contributorCount: number;
  headline: string;
  maybeLine: string;
  basisLine: string;
  averages: {
    enjoyment: number;
    learning: number;
    mentorship: number;
    clarityGained: number;
  } | null;
  topSkills: string[];
  payRange: { low: number; high: number } | null;
  sharedNotes: string[];
};

function mean(values: number[]): number {
  const total = values.reduce((sum, value) => sum + value, 0);
  return Number((total / values.length).toFixed(1));
}

function distinctUserIds(reviews: readonly ReviewForAggregate[]): Set<string> {
  return new Set(reviews.map((review) => review.userId));
}

export function aggregateForMajor(
  reviews: readonly ReviewForAggregate[],
  major: string,
  approvedSkills: readonly string[],
): PublicMajorView {
  const group = reviews.filter((review) => review.major === major);
  const contributors = distinctUserIds(group);
  const approved = new Set(approvedSkills);
  const hidden: PublicMajorView = {
    visible: false,
    major,
    reviewCount: group.length,
    contributorCount: contributors.size,
    headline: "",
    maybeLine: "",
    basisLine: "",
    averages: null,
    topSkills: [],
    payRange: null,
    sharedNotes: [],
  };
  if (contributors.size < MIN_DISTINCT_CONTRIBUTORS) return hidden;

  const yes = group.filter((review) => review.wouldReturn === "yes").length;
  const maybe = group.filter((review) => review.wouldReturn === "maybe").length;
  const no = group.filter((review) => review.wouldReturn === "no").length;
  const summary = wouldGoBackSummary({
    yes,
    maybe,
    no,
    contributorCount: contributors.size,
  });

  const counts = new Map<string, number>();
  for (const review of group) {
    for (const skill of review.skillsUsed) {
      if (!approved.has(skill)) continue;
      counts.set(skill, (counts.get(skill) ?? 0) + 1);
    }
  }
  const topSkills = [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 5)
    .map(([skill]) => skill);

  const payContributors = new Set<string>();
  const pays: number[] = [];
  for (const review of group) {
    if (typeof review.payHourly !== "number" || !Number.isFinite(review.payHourly)) continue;
    payContributors.add(review.userId);
    pays.push(review.payHourly);
  }
  const payRange =
    payContributors.size >= MIN_DISTINCT_PAY_CONTRIBUTORS
      ? { low: Math.floor(Math.min(...pays)), high: Math.ceil(Math.max(...pays)) }
      : null;

  // Free text only with per-note consent, and only once the major group is visible.
  const sharedNotes = group
    .filter((review) => review.shareFreeText && (review.freeText?.trim().length ?? 0) > 0)
    .map((review) => review.freeText!.trim());

  return {
    visible: true,
    major,
    reviewCount: group.length,
    contributorCount: contributors.size,
    headline: summary.headline,
    maybeLine: summary.maybeLine,
    basisLine: summary.basisLine,
    averages: {
      enjoyment: mean(group.map((review) => review.enjoyment)),
      learning: mean(group.map((review) => review.learning)),
      mentorship: mean(group.map((review) => review.mentorship)),
      clarityGained: mean(group.map((review) => review.clarityGained)),
    },
    topSkills,
    payRange,
    sharedNotes,
  };
}
