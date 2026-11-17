export const ROLE_TYPE_VALUES = [
  "design",
  "test_validation",
  "manufacturing_process",
  "software",
  "data_analytics",
  "research",
  "field_site",
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
  { value: "other", label: "Other" },
];

export function isRoleType(value: string): value is RoleType {
  return (ROLE_TYPE_VALUES as readonly string[]).includes(value);
}

export function roleLabel(value: string): string {
  return ROLE_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? "Other";
}
