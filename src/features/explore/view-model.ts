import { CATALOG_COMPANIES } from "@/features/explore/companies";
import { directionExploreCopy, type StudentExploreInput } from "@/features/explore/from-direction";
import {
  MOCK_EXPERIENCES,
  MOCK_QUESTIONS,
  MOCK_REPORTS,
  type MockExperience,
} from "@/features/community/mock/data";
import { careerLinkById, careerPageHref } from "@/features/explore/links";
import { CAREER_EXPLORE_PROTOTYPE_ENABLED } from "@/features/explore/prototype";
import type { CompanyCardModel, ExploreModel, SampleExperience, ScopeOption } from "@/features/explore/types";

/** Demo discussion topics. These are not the signed-in student's career pathways. */
const DISCUSSION_ROLES = [
  { id: "clinical-operations", title: "Clinical operations" },
  { id: "community-programs", title: "Community programs" },
  { id: "public-environmental", title: "Public environmental work" },
  { id: "business-operations", title: "Business operations" },
  { id: "consulting", title: "Consulting" },
  { id: "finance", title: "Finance" },
  { id: "product-design", title: "Product design" },
  { id: "manufacturing", title: "Manufacturing" },
] as const;

/** Role categories present in the directory, for the filter. Read from the company list. */
export const COMPANY_ROLE_FILTERS: readonly string[] = [
  ...new Set(CATALOG_COMPANIES.flatMap((company) => company.roleCategories)),
].sort((left, right) => left.localeCompare(right));

function isSharedSample(item: MockExperience): boolean {
  return item.sharingConsent === true && item.body.trim().length > 0;
}

function assembleExploreModel(): ExploreModel {
  const names = new Map(CATALOG_COMPANIES.map((company) => [company.id, company.name]));
  const shared = MOCK_EXPERIENCES.filter(isSharedSample);
  const experiences: SampleExperience[] = [];
  for (const item of shared) {
    const companyName = names.get(item.companyId);
    if (!companyName) continue;
    experiences.push({
      id: item.id,
      companyName,
      role: item.role,
      authorLabel: item.authorLabel,
      body: item.body,
    });
  }

  const experienceCount = new Map<string, number>();
  for (const item of shared) {
    experienceCount.set(item.companyId, (experienceCount.get(item.companyId) ?? 0) + 1);
  }

  const companies: CompanyCardModel[] = CATALOG_COMPANIES.map((company) => {
    const link = company.careerLinkId ? careerLinkById(company.careerLinkId) : null;
    const careersUrl = link ? careerPageHref(link.finalUrl) : null;
    return {
      id: company.id,
      name: company.name,
      field: company.field,
      roleCategories: [...company.roleCategories],
      whyShown: company.whyShown,
      experienceCount: experienceCount.get(company.id) ?? 0,
      careersUrl,
      linkCheckedOn: careersUrl && link ? link.checkedOn : null,
    };
  });

  const scopes: ScopeOption[] = [
    ...DISCUSSION_ROLES.map((path) => ({
      value: `role:${path.id}`,
      label: `Role: ${path.title}`,
      shortLabel: path.title,
    })),
    ...CATALOG_COMPANIES.map((company) => ({
      value: `company:${company.id}`,
      label: `Company: ${company.name}`,
      shortLabel: company.name,
    })),
  ];

  return {
    profile: { majorLabel: "", goalLabel: "", note: "" },
    direction: { headline: "", note: "", needsQuiz: true },
    paths: [],
    pathsIntro: "",
    pathsEmpty: null,
    experiences,
    questions: MOCK_QUESTIONS.map((question) => ({
      ...question,
      localOnly: false,
      answers: question.answers.map((answer) => ({ ...answer, localOnly: false })),
    })),
    scopes,
    companyRoles: [...COMPANY_ROLE_FILTERS],
    companies,
    reports: MOCK_REPORTS.map((report) => ({ ...report, preview: null })),
  };
}

const EMPTY_STUDENT: StudentExploreInput = {
  stored: { major: null, majorSource: null, customMajorText: null },
  goal: null,
  direction: null,
  dismissedRoleIds: [],
};

export function buildExploreModel(input: StudentExploreInput = EMPTY_STUDENT): ExploreModel {
  const shell = assembleExploreModel();
  const copy = directionExploreCopy(input);
  return {
    ...shell,
    profile: copy.profile,
    direction: copy.direction,
    paths: copy.paths,
    pathsIntro: copy.pathsIntro,
    pathsEmpty: copy.pathsEmpty,
    companies: copy.companies(shell.companies),
  };
}

export function prototypeModel(
  enabled: boolean = CAREER_EXPLORE_PROTOTYPE_ENABLED,
): ExploreModel | null {
  if (!enabled) return null;
  return buildExploreModel(EMPTY_STUDENT);
}
