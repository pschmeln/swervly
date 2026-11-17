import { wouldGoBackSummary, type WouldReturn } from "@/features/review/would-return";

export const MIN_REVIEWS_TO_SHOW = 3;
export const MIN_PAY_REPORTS = 3;

export type ReviewForAggregate = {
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
  headline: string;
  maybeLine: string;
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

export function aggregateForMajor(
  reviews: readonly ReviewForAggregate[],
  major: string,
  approvedSkills: readonly string[],
): PublicMajorView {
  const group = reviews.filter((review) => review.major === major);
  const approved = new Set(approvedSkills);
  const hidden: PublicMajorView = {
    visible: false,
    major,
    reviewCount: group.length,
    headline: "",
    maybeLine: "",
    averages: null,
    topSkills: [],
    payRange: null,
    sharedNotes: [],
  };
  if (group.length < MIN_REVIEWS_TO_SHOW) return hidden;

  const yes = group.filter((review) => review.wouldReturn === "yes").length;
  const maybe = group.filter((review) => review.wouldReturn === "maybe").length;
  const no = group.filter((review) => review.wouldReturn === "no").length;
  const summary = wouldGoBackSummary({ yes, maybe, no, major });

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

  const pays = group
    .map((review) => review.payHourly)
    .filter((pay): pay is number => typeof pay === "number" && Number.isFinite(pay));
  const payRange =
    pays.length >= MIN_PAY_REPORTS
      ? { low: Math.floor(Math.min(...pays)), high: Math.ceil(Math.max(...pays)) }
      : null;

  const sharedNotes = group
    .filter((review) => review.shareFreeText && (review.freeText?.trim().length ?? 0) > 0)
    .map((review) => review.freeText!.trim());

  return {
    visible: true,
    major,
    reviewCount: group.length,
    headline: summary.headline,
    maybeLine: summary.maybeLine,
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
