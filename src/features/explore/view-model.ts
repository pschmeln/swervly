import { CATALOG_COMPANIES } from "@/features/explore/companies";
import {
  MOCK_EXPERIENCES,
  MOCK_QUESTIONS,
  MOCK_REPORTS,
  type MockExperience,
} from "@/features/community/mock/data";
import { CAREER_LINK_CHECKED_ON, careerLinkById, careerPageHref } from "@/features/explore/links";
import { CAREER_EXPLORE_PROTOTYPE_ENABLED } from "@/features/explore/prototype";
import type {
  CareerPath,
  CompanyCardModel,
  ExploreModel,
  SampleExperience,
  ScopeOption,
} from "@/features/explore/types";

const PATHS: readonly CareerPath[] = [
  {
    id: "clinical-operations",
    title: "Clinical operations",
    summary: "A sample path about how a hospital or clinic runs day to day.",
  },
  {
    id: "community-programs",
    title: "Community programs",
    summary: "A sample path about education and neighborhood programs.",
  },
  {
    id: "public-environmental",
    title: "Public environmental work",
    summary: "A sample path about environmental programs in public or nonprofit settings.",
  },
  {
    id: "business-operations",
    title: "Business operations",
    summary: "A sample path about how a consumer or retail organization runs.",
  },
  {
    id: "consulting",
    title: "Consulting",
    summary: "A sample path about project-based client work.",
  },
  {
    id: "finance",
    title: "Finance",
    summary: "A sample path about banking and public finance.",
  },
  {
    id: "product-design",
    title: "Product design",
    summary: "A sample path about designing services and products with other people.",
  },
  {
    id: "manufacturing",
    title: "Manufacturing",
    summary: "A sample path about making physical products.",
  },
];

export const COMPANY_ROLE_FILTERS = [
  "Clinical operations",
  "Community programs",
  "Public environmental work",
  "Business operations",
  "Consulting",
  "Finance",
  "Product design",
  "Manufacturing",
  "No category on file",
] as const;

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
      linkCheckedOn: careersUrl ? CAREER_LINK_CHECKED_ON : null,
    };
  });

  const scopes: ScopeOption[] = [
    ...PATHS.map((path) => ({
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
    profile: {
      displayName: "Rowan Example",
      focus: "Illustrated focus: clinical operations and community programs.",
      goal: "Illustrated goal: try a care or community-program co-op.",
    },
    direction: {
      headline: "Sample direction: look at clinical operations and community programs.",
      note: "Sample copy for this prototype screen. Your quiz result stays on Direction.",
    },
    paths: [...PATHS],
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

export function prototypeModel(
  enabled: boolean = CAREER_EXPLORE_PROTOTYPE_ENABLED,
): ExploreModel | null {
  if (!enabled) return null;
  return assembleExploreModel();
}
