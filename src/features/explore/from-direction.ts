import { withoutDismissedRoles } from "@/features/direction/career-roles";
import type { Goal } from "@/features/direction/rules";
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
 * Directory categories that use the same words as a direction role.
 * Engineering "design" is not product design. Healthcare administration is not clinical work.
 */
const ROLE_DIRECTORY: Record<string, readonly string[]> = {
  business_operations: ["Business operations"],
  finance: ["Finance"],
  healthcare_clinical: ["Clinical operations"],
  manufacturing_process: ["Manufacturing"],
};

const QUIZ_HEADLINE = "Take the quiz first.";
const QUIZ_NOTE = "Direction matches roles to how you work.";
const DISMISSED_NOTE = "You dismissed the current suggestions. You can change your major on your profile.";
const PATHS_READY =
  "These pathways are your Direction suggestions. Ones backed by student reviews say so.";
const PATHS_QUIZ = "Career pathways show up here after you take the quiz.";
const PATHS_DISMISSED = "No pathways are listed while those suggestions are dismissed.";
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
    for (const category of ROLE_DIRECTORY[roleId] ?? []) categories.add(category);
  }
  return categories;
}

function whyForCompany(company: CompanyCardModel, categories: ReadonlySet<string>): string {
  if (company.id === "sample-empty") return company.whyShown;
  const shared = company.roleCategories.filter((category) => categories.has(category));
  if (shared.length === 0) return DIRECTORY_WHY_SHOWN;
  return `Listed under ${shared.join(" and ")}, which is also one of your direction suggestions.`;
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
      pathsEmpty: PATHS_QUIZ,
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
      item.evidenceLabel?.trim() || (item.source === "similar_students" ? "Backed by student reviews" : "Matched to your quiz and major"),
  }));
  const categories = overlapCategories(insufficient ? [] : pathways.map((path) => path.id));

  return {
    profile,
    direction: {
      headline: input.direction.label,
      note: dismissedAll ? DISMISSED_NOTE : insufficient ? PATHS_INSUFFICIENT : PATHS_READY,
      needsQuiz: false,
    },
    paths: pathways,
    pathsIntro: dismissedAll ? PATHS_DISMISSED : insufficient ? PATHS_INSUFFICIENT : PATHS_READY,
    pathsEmpty: pathways.length === 0 ? (dismissedAll ? PATHS_DISMISSED : PATHS_QUIZ) : null,
    companies: (companies) => companies.map((company) => ({ ...company, whyShown: whyForCompany(company, categories) })),
  };
}
