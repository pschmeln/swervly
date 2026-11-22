import { CATALOG_COMPANIES } from "@/features/explore/companies";
import { directionExploreCopy, type StudentExploreInput } from "@/features/explore/from-direction";
import { careerLinkById, careerPageHref } from "@/features/explore/links";
import type { CompanyCardModel, ExploreModel } from "@/features/explore/types";

/** Role categories present in the directory, for the filter. Read from the company list. */
export const COMPANY_ROLE_FILTERS: readonly string[] = [
  ...new Set(CATALOG_COMPANIES.flatMap((company) => company.roleCategories)),
].sort((left, right) => left.localeCompare(right));

function directoryCompanies(): CompanyCardModel[] {
  return CATALOG_COMPANIES.map((company) => {
    const link = company.careerLinkId ? careerLinkById(company.careerLinkId) : null;
    const careersUrl = link ? careerPageHref(link.finalUrl) : null;
    return {
      id: company.id,
      name: company.name,
      field: company.field,
      roleCategories: [...company.roleCategories],
      whyShown: company.whyShown,
      careersUrl,
      linkCheckedOn: careersUrl && link ? link.checkedOn : null,
    };
  });
}

const EMPTY_STUDENT: StudentExploreInput = {
  stored: { major: null, majorSource: null, customMajorText: null },
  goal: null,
  direction: null,
  dismissedRoleIds: [],
};

/** The company directory (Community > Companies) with Direction overlap explained on each card. */
export function buildExploreModel(input: StudentExploreInput = EMPTY_STUDENT): ExploreModel {
  const copy = directionExploreCopy(input);
  return {
    profile: copy.profile,
    direction: copy.direction,
    paths: copy.paths,
    pathsIntro: copy.pathsIntro,
    pathsEmpty: copy.pathsEmpty,
    companyRoles: [...COMPANY_ROLE_FILTERS],
    companies: copy.companies(directoryCompanies()),
  };
}
