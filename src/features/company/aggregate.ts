import { wouldGoBackByStudent, wouldGoBackSummary, type WouldReturn } from "@/features/review/would-return";

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
  /** The student's rotation number; their highest one counts for "would go back". */
  rotationNumber: number;
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
  /** A catalog major, or ALL_MAJORS for the fallback. */
  major: string;
  /** Percent of students whose latest co-op here says they would go back. */
  wouldGoBackPercent: number | null;
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

export const ALL_MAJORS = "All majors";

type GroupOptions = {
  /** Shared notes and pay are shown only in the author's own major (what sharing consent covers). */
  notesAndPay: boolean;
};

export function hiddenView(major = "", reviewCount = 0, contributorCount = 0): PublicMajorView {
  return {
    visible: false,
    major,
    wouldGoBackPercent: null,
    reviewCount,
    contributorCount,
    headline: "",
    maybeLine: "",
    basisLine: "",
    averages: null,
    topSkills: [],
    payRange: null,
    sharedNotes: [],
  };
}

function aggregateGroup(
  group: readonly ReviewForAggregate[],
  major: string,
  approvedSkills: readonly string[],
  options: GroupOptions,
): PublicMajorView {
  const contributors = distinctUserIds(group);
  if (contributors.size < MIN_DISTINCT_CONTRIBUTORS) return hiddenView(major, group.length, contributors.size);
  const approved = new Set(approvedSkills);

  const goBack = wouldGoBackByStudent(group);
  const summary = wouldGoBackSummary({
    yes: goBack.yes,
    maybe: goBack.maybe,
    students: goBack.students,
    percentYes: goBack.percentYes,
    reviewCount: group.length,
    groupLabel: major === ALL_MAJORS ? null : major,
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

  let payRange: PublicMajorView["payRange"] = null;
  let sharedNotes: string[] = [];
  if (options.notesAndPay) {
    const payContributors = new Set<string>();
    const pays: number[] = [];
    for (const review of group) {
      if (typeof review.payHourly !== "number" || !Number.isFinite(review.payHourly)) continue;
      payContributors.add(review.userId);
      pays.push(review.payHourly);
    }
    if (payContributors.size >= MIN_DISTINCT_PAY_CONTRIBUTORS) {
      payRange = { low: Math.floor(Math.min(...pays)), high: Math.ceil(Math.max(...pays)) };
    }
    // Free text only with per-note consent, and only once the major group is visible.
    sharedNotes = group
      .filter((review) => review.shareFreeText && (review.freeText?.trim().length ?? 0) > 0)
      .map((review) => review.freeText!.trim());
  }

  return {
    visible: true,
    major,
    wouldGoBackPercent: goBack.percentYes,
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

/** The viewer's own major: averages, would go back, skills, pay (3+ reporters) and shared notes. */
export function aggregateForMajor(
  reviews: readonly ReviewForAggregate[],
  major: string,
  approvedSkills: readonly string[],
): PublicMajorView {
  return aggregateGroup(reviews.filter((review) => review.major === major), major, approvedSkills, { notesAndPay: true });
}

/**
 * Fallback across every major (item 4), under the same 2-student minimum. Ratings, would go
 * back and skills only: no pay and no written notes, which stay within the author's major.
 */
export function aggregateAllMajors(
  reviews: readonly ReviewForAggregate[],
  approvedSkills: readonly string[],
): PublicMajorView {
  return aggregateGroup(reviews, ALL_MAJORS, approvedSkills, { notesAndPay: false });
}

export type CompanyAverages = {
  mine: PublicMajorView;
  /** All-majors fallback, only when the viewer's major is hidden and the fallback passes the minimum. */
  allMajors: PublicMajorView | null;
};

export function companyAverages(
  reviews: readonly ReviewForAggregate[],
  viewerMajor: string | null,
  approvedSkills: readonly string[],
): CompanyAverages {
  const mine = viewerMajor ? aggregateForMajor(reviews, viewerMajor, approvedSkills) : hiddenView();
  if (mine.visible) return { mine, allMajors: null };
  const all = aggregateAllMajors(reviews, approvedSkills);
  return { mine, allMajors: all.visible ? all : null };
}
