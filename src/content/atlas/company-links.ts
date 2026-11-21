import { COMPANIES } from "@/content/companies";
import type { FamilyId } from "@/features/atlas/types";

/**
 * Company id → Career Atlas families, read from src/content/companies.ts.
 *
 * A link means only "Swervly lists this organization under this area". It is
 * never a claim that the organization is hiring, or hiring for any occupation.
 */
export const COMPANY_FAMILIES: Readonly<Record<string, readonly FamilyId[]>> = Object.fromEntries(
  COMPANIES.filter((company) => company.families.length > 0).map((company) => [company.id, company.families]),
);

export const COMPANY_NOTE = "Organizations Swervly's directory lists under this area. This doesn't mean they're hiring for this role.";
