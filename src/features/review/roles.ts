export const ROLE_TYPE_VALUES = [
  "design",
  "test_validation",
  "manufacturing_process",
  "software",
  "data_analytics",
  "research",
  "field_site",
  // Outside engineering (Nov 2026). Same ids as Direction's career roles, so a review
  // of one of these can count as student evidence for it.
  "business_operations",
  "finance",
  "marketing",
  "healthcare_clinical",
  "healthcare_admin",
  "laboratory",
  "teaching",
  "counseling_support",
  "policy_research",
  "writing_media",
  "other",
] as const;

export type RoleType = (typeof ROLE_TYPE_VALUES)[number];

export const ROLE_TYPE_OPTIONS: readonly { value: RoleType; label: string }[] = [
  { value: "design", label: "Design" },
  { value: "test_validation", label: "Test/Validation" },
  { value: "manufacturing_process", label: "Manufacturing/Process" },
  { value: "software", label: "Software" },
  { value: "data_analytics", label: "Data/Analytics" },
  { value: "research", label: "Research" },
  { value: "field_site", label: "Field/Site" },
  { value: "business_operations", label: "Business operations" },
  { value: "finance", label: "Finance" },
  { value: "marketing", label: "Marketing" },
  { value: "healthcare_clinical", label: "Healthcare — clinical" },
  { value: "healthcare_admin", label: "Healthcare administration" },
  { value: "laboratory", label: "Laboratory work" },
  { value: "teaching", label: "Teaching" },
  { value: "counseling_support", label: "Counseling and student support" },
  { value: "policy_research", label: "Policy and research" },
  { value: "writing_media", label: "Writing and media" },
  { value: "other", label: "Other" },
];

export function isRoleType(value: string): value is RoleType {
  return (ROLE_TYPE_VALUES as readonly string[]).includes(value);
}

export function roleLabel(value: string): string {
  return ROLE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Other";
}
