import { EXTRA_CAREER_ROLE_IDS, type ExtraCareerRole } from "@/features/direction/career-roles";
import { ROLE_TYPE_VALUES, type RoleType } from "@/features/review/roles";
import type { FamilyId } from "@/features/atlas/types";

/**
 * Existing Direction role → Career Atlas families.
 * Direction is not changed by this file; Atlas only reads it.
 * `other` and `insufficient` never map to anything.
 */
export const ROLE_FAMILIES: Readonly<Record<RoleType | ExtraCareerRole, readonly FamilyId[]>> = {
  design: ["fam:design-development", "fam:industrial-design"],
  test_validation: ["fam:simulation-validation"],
  manufacturing_process: ["fam:manufacturing-automation", "fam:chemical-process"],
  software: ["fam:software-engineering", "fam:electronics-hardware"],
  data_analytics: ["fam:data-analytics"],
  research: ["fam:engineering-rd", "fam:laboratory-science"],
  field_site: ["fam:construction-field", "fam:environmental"],
  other: [],
  business_operations: ["fam:business-operations", "fam:product-management"],
  finance: ["fam:finance"],
  marketing: ["fam:marketing"],
  healthcare_clinical: ["fam:clinical-care"],
  healthcare_admin: ["fam:health-administration"],
  laboratory: ["fam:laboratory-science"],
  teaching: ["fam:teaching-advising"],
  counseling_support: ["fam:teaching-advising"],
  // No policy family in the prototype dataset yet.
  policy_research: [],
  writing_media: ["fam:writing-communication"],
  insufficient: [],
};

export const ALL_ROLE_IDS: readonly string[] = [...ROLE_TYPE_VALUES, ...EXTRA_CAREER_ROLE_IDS];

export function familiesForRole(role: string): readonly FamilyId[] {
  return (ROLE_FAMILIES as Readonly<Record<string, readonly FamilyId[]>>)[role] ?? [];
}

export function rolesForFamily(familyId: FamilyId): string[] {
  return Object.entries(ROLE_FAMILIES)
    .filter(([, families]) => families.includes(familyId))
    .map(([role]) => role);
}
