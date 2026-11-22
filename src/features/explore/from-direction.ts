import { careerRoleLabel, withoutDismissedRoles } from "@/features/direction/career-roles";
import { DIRECTION_EXHAUSTED_ACTION, type Goal } from "@/features/direction/rules";
import {
  academicSource,
  displayMajor,
  type AcademicSource,
  type StoredMajor,
} from "@/features/majors/selection";
import { DIRECTORY_WHY_SHOWN } from "@/features/explore/companies";
import type { CareerPath, CompanyCardModel, ExploreDirection, ExploreProfile } from "@/features/explore/types";

export type ExploreSuggestion = {
  roleType: string;
  roleLabel: string;
  reason: string;
  source: "rules" | "similar_students";
  evidenceLabel?: string | null;
};

export type StudentExploreInput = {
  stored: StoredMajor;
  goal: Goal | null;
  direction: { label: string; suggestions: readonly ExploreSuggestion[] } | null;
  dismissedRoleIds: readonly string[];
};

/**
 * Directory role categories are Direction's own role ids (src/content/companies.ts), shown
 * by label, so a match always means the same role. Engineering design is not product
 * design (IDEO is not tagged Design), and healthcare administration is not clinical work.
 */

const QUIZ_HEADLINE = "Take the quiz first.";
const QUIZ_NOTE = "Direction matches roles to how you work.";
/** Pathways intro when Direction has concrete suggestions. Shown once, under Explore career paths. */
export const PATHS_READY =
  "These pathways are your Direction suggestions. Ones backed by student reviews say so.";
const PATHS_QUIZ = "Career pathways show up here after you take the quiz.";
const PATHS_DISMISSED = "No pathways to show right now.";
const PATHS_INSUFFICIENT = "There is not enough information for a pathway yet.";

export type DirectionExploreCopy = {
  profile: ExploreProfile;
  direction: ExploreDirection;
  paths: CareerPath[];
  pathsIntro: string;
  pathsEmpty: string | null;
  companies: (companies: readonly CompanyCardModel[]) => CompanyCardModel[];
};

function goalLabel(goal: Goal | null): string {
  if (goal === "industry") return "Industry";
  if (goal === "grad_school") return "Graduate school";
  if (goal === "undecided") return "Undecided";
  return "Not on your profile yet";
}

function profileNote(source: AcademicSource): string {
  if (source === "custom") {
    return "Your major is on your profile. It is not used to choose companies or career links.";
  }
  if (source === "undecided") {
    return "Your major is undecided. Career links below are a directory.";
  }
  if (source === "unset") {
    return "Your major is not on your profile yet. Career links below are a directory.";
  }
  return "Career links below are a directory of official careers pages.";
}

export function majorLabelForOwner(stored: StoredMajor): string {
  if (academicSource(stored) === "unset") return "Not on your profile yet";
  const label = displayMajor(stored).trim();
  if (!label) return "Not on your profile yet";
  return label;
}

function overlapCategories(roleIds: readonly string[]): Set<string> {
  const categories = new Set<string>();
  for (const roleId of roleIds) {
    if (roleId === "insufficient") continue;
    categories.add(careerRoleLabel(roleId));
  }
  return categories;
}

function whyForCompany(company: CompanyCardModel, categories: ReadonlySet<string>): string {
  const shared = company.roleCategories.filter((category) => categories.has(category));
  if (shared.length === 0) return DIRECTORY_WHY_SHOWN;
  if (shared.length === 1) return `Listed under ${shared[0]}, which is also one of your direction suggestions.`;
  return `Listed under ${shared.join(" and ")}, which are also among your direction suggestions.`;
}

export function directionExploreCopy(input: StudentExploreInput): DirectionExploreCopy {
  const source = academicSource(input.stored);
  const profile: ExploreProfile = {
    majorLabel: majorLabelForOwner(input.stored),
    goalLabel: goalLabel(input.goal),
    note: profileNote(source),
  };

  if (!input.direction) {
    return {
      profile,
      direction: { headline: QUIZ_HEADLINE, note: QUIZ_NOTE, needsQuiz: true },
      paths: [],
      pathsIntro: PATHS_QUIZ,
      // The intro already says it. Showing it again as the empty state printed it twice.
      pathsEmpty: null,
      companies: (companies) => companies.map((company) => ({ ...company, whyShown: whyForCompany(company, new Set()) })),
    };
  }

  const remaining = withoutDismissedRoles(input.direction.suggestions, input.dismissedRoleIds);
  const concrete = remaining.filter((item) => item.roleType !== "insufficient");
  const shown = concrete.length > 0 ? concrete : remaining.filter((item) => item.roleType === "insufficient");
  const dismissedAll = shown.length === 0;
  const insufficient = !dismissedAll && shown.every((item) => item.roleType === "insufficient");
  const pathways = shown.map((item) => ({
    id: item.roleType,
    title: item.roleLabel,
    summary: item.reason,
    sourceLabel:
      item.evidenceLabel?.trim() ||
      (item.source === "similar_students" ? "Backed by student reviews" : null),
  }));
  const categories = overlapCategories(insufficient ? [] : pathways.map((path) => path.id));

  return {
    profile,
    direction: {
      headline: input.direction.label,
      // PATHS_READY belongs under Explore career paths only — putting it here duplicated the sentence.
      note: dismissedAll ? DIRECTION_EXHAUSTED_ACTION : insufficient ? PATHS_INSUFFICIENT : "",
      needsQuiz: false,
      exhausted: dismissedAll,
    },
    paths: pathways,
    // Insufficient copy lives on direction.note (and the insufficient path card); don't repeat it here.
    pathsIntro: dismissedAll ? PATHS_DISMISSED : insufficient ? "" : PATHS_READY,
    // Every empty case is already explained by pathsIntro or direction.note, so there is no second message.
    pathsEmpty: null,
    companies: (companies) => companies.map((company) => ({ ...company, whyShown: whyForCompany(company, categories) })),
  };
}
