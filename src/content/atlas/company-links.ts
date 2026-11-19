import type { FamilyId } from "@/features/atlas/types";

/**
 * Directory organization → Career Atlas families (editorial).
 *
 * Keys are ids from CATALOG_COMPANIES in src/features/explore/companies.ts.
 * A link means only "Swervly lists this organization under this area". It is
 * never a claim that the organization is hiring, or hiring for any occupation.
 * Careers links come from the existing verified allowlist, unchanged.
 */
export const COMPANY_FAMILIES: Readonly<Record<string, readonly FamilyId[]>> = {
  cchmc: ["fam:clinical-care", "fam:health-administration", "fam:laboratory-science"],
  mayo: ["fam:clinical-care", "fam:health-administration", "fam:laboratory-science"],
  tfa: ["fam:teaching-advising"],
  tnc: ["fam:environmental"],
  epa: ["fam:environmental"],
  pg: ["fam:business-operations", "fam:marketing", "fam:manufacturing-automation"],
  kroger: ["fam:business-operations"],
  deloitte: ["fam:business-operations", "fam:data-analytics"],
  pnc: ["fam:finance"],
  "cleveland-fed": ["fam:finance", "fam:data-analytics"],
  ideo: ["fam:industrial-design"],
  "ge-aerospace": ["fam:manufacturing-automation", "fam:design-development", "fam:simulation-validation"],
};

export const COMPANY_NOTE = "Organizations Swervly's directory lists under this area. This doesn't mean they're hiring for this role.";
