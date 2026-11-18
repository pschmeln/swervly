import { ROLE_TYPE_VALUES, roleLabel } from "@/features/review/roles";

export const EXTRA_CAREER_ROLE_IDS = [
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
  "insufficient",
] as const;

export type ExtraCareerRole = (typeof EXTRA_CAREER_ROLE_IDS)[number];

const EXTRA_LABELS: Record<ExtraCareerRole, string> = {
  business_operations: "Business operations",
  finance: "Finance",
  marketing: "Marketing",
  healthcare_clinical: "Healthcare — clinical",
  healthcare_admin: "Healthcare administration",
  laboratory: "Laboratory work",
  teaching: "Teaching",
  counseling_support: "Counseling and student support",
  policy_research: "Policy and research",
  writing_media: "Writing and media",
  insufficient: "Not enough to suggest a role",
};

export function careerRoleLabel(id: string): string {
  if ((EXTRA_CAREER_ROLE_IDS as readonly string[]).includes(id)) {
    return EXTRA_LABELS[id as ExtraCareerRole];
  }
  return roleLabel(id);
}

export function isCareerRoleId(id: string): boolean {
  return (ROLE_TYPE_VALUES as readonly string[]).includes(id) || (EXTRA_CAREER_ROLE_IDS as readonly string[]).includes(id);
}

/** Careers the student marked Interested come first; the rest keep their order. */
export function interestedFirst<T extends { roleType: string }>(
  items: readonly T[],
  interested: readonly string[],
): T[] {
  if (interested.length === 0) return [...items];
  const wanted = new Set(interested);
  return [...items.filter((item) => wanted.has(item.roleType)), ...items.filter((item) => !wanted.has(item.roleType))];
}

export function withoutDismissedRoles<T extends { roleType: string }>(
  items: readonly T[],
  dismissed: readonly string[],
): T[] {
  if (dismissed.length === 0) return [...items];
  const hidden = new Set(dismissed);
  return items.filter((item) => !hidden.has(item.roleType));
}
