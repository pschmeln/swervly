import { COMPANIES } from "@/content/companies";
import { careerRoleLabel, type CareerRoleId } from "@/features/direction/career-roles";
import { hasCareerLink, type CareerLinkId } from "@/features/explore/links";

export const DIRECTORY_WHY_SHOWN = "Included in this directory of official careers pages.";

export type CatalogCompany = {
  id: string;
  name: string;
  field: string;
  /** Labels of roleTypes, for display and the role filter. */
  roleCategories: readonly string[];
  roleTypes: readonly CareerRoleId[];
  whyShown: string;
  /** Null when no official careers page is on file. */
  careerLinkId: CareerLinkId | null;
};

/**
 * The directory: every company in src/content/companies.ts whose careers page passed a
 * check. Built from the same list as the co-op form's employers, so every company here
 * can be picked when a student logs a co-op. No placeholder or invented entries.
 */
export const CATALOG_COMPANIES: readonly CatalogCompany[] = COMPANIES.filter((company) => hasCareerLink(company.id)).map(
  (company) => ({
    id: company.id,
    name: company.name,
    field: company.industry ?? "Industry not on file",
    roleCategories: company.roleTypes.map(careerRoleLabel),
    roleTypes: company.roleTypes,
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: company.id,
  }),
);
