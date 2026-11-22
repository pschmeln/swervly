/**
 * Who Swervly is built for right now (founder decision, Nov 22, 2026).
 *
 * "engineering": students see only engineering and computing majors, the careers
 * engineers actually go into, and engineering employers. Everything else stays in
 * the code and the data, just hidden from students.
 * "all": every major and career, as before.
 *
 * Flip this one constant to bring the hidden parts back. Nothing is deleted.
 */
export type Audience = "engineering" | "all";

const CURRENT: Audience = "engineering";

/** Major categories a student can pick (src/features/majors/catalog.ts). */
const ENGINEERING_MAJOR_CATEGORIES: ReadonlySet<string> = new Set([
  "Engineering & Technology",
  "Computer Science & Information Technology",
  // Founder-approved majors students typed in themselves.
  "Student-submitted",
]);

/** Career map families: engineering and computing, plus the common exits engineers take. */
const ENGINEERING_FAMILIES: ReadonlySet<string> = new Set([
  "fam:design-development",
  "fam:manufacturing-automation",
  "fam:simulation-validation",
  "fam:energy-thermal",
  "fam:engineering-rd",
  "fam:electronics-hardware",
  "fam:construction-field",
  "fam:chemical-process",
  "fam:environmental",
  "fam:laboratory-science",
  "fam:industrial-design",
  "fam:software-engineering",
  "fam:data-analytics",
  "fam:security-it",
  "fam:product-management",
  "fam:business-operations",
  "fam:finance",
  "fam:writing-communication",
]);

/** Specializations hidden even though one of their families is shown. */
const ENGINEERING_HIDDEN_SPECIALIZATIONS: ReadonlySet<string> = new Set([
  "spec:investigation-forensics",
  "spec:social-research",
  "spec:epidemiology",
  "spec:hr",
  "spec:journalism",
  "spec:writing-editing",
  "spec:translation",
  "spec:public-relations",
]);

/** Direction roles (src/features/direction/career-roles.ts) that are not engineering paths. */
const ENGINEERING_HIDDEN_ROLES: ReadonlySet<string> = new Set([
  "marketing",
  "healthcare_clinical",
  "healthcare_admin",
  "teaching",
  "counseling_support",
  "policy_research",
  "writing_media",
]);

/** Landing copy per audience. The "all" lines are the copy used before Nov 22, 2026. */
const AUDIENCE_COPIES = {
  engineering: {
    pitch:
      "Most engineering students pick co-ops with almost no information about what they'll actually enjoy. Swervly learns how you work, then points you toward co-ops that fit.",
    directionStep: "Engineering careers matched to how you work, sharper as more students review co-ops.",
    whoFor:
      "Engineering and computing students with an email that ends in .edu. Swervly is free, and it is not affiliated with a university.",
  },
  all: {
    pitch:
      "Most students pick co-ops with almost no information about what they'll actually enjoy. Swervly learns how you work, then points you toward co-ops that fit.",
    directionStep: "Careers and majors matched to how you work, sharper as more students review co-ops.",
    whoFor: "Any student with an email that ends in .edu. Swervly is free, and it is not affiliated with a university.",
  },
} as const;

/** Every audience check, for one audience. Tests build the "all" set to cover hidden parts. */
export function audienceRules(audience: Audience) {
  const all = audience === "all";
  const showsFamily = (familyId: string) => all || ENGINEERING_FAMILIES.has(familyId);
  return {
    AUDIENCE: audience,
    showsMajorCategory: (category: string) => all || ENGINEERING_MAJOR_CATEGORIES.has(category),
    showsFamily,
    /** Shows when it is not hidden and at least one of its families shows. */
    showsSpecialization: (specialization: { id: string; families: readonly string[] }) =>
      all || (!ENGINEERING_HIDDEN_SPECIALIZATIONS.has(specialization.id) && specialization.families.some(showsFamily)),
    showsRole: (roleId: string) => all || !ENGINEERING_HIDDEN_ROLES.has(roleId),
    /** Shows unless every career family it is listed under is hidden. */
    showsCompany: (company: { families: readonly string[] }) =>
      all || company.families.length === 0 || company.families.some(showsFamily),
    AUDIENCE_COPY: AUDIENCE_COPIES[audience],
  };
}

export const { AUDIENCE, showsMajorCategory, showsFamily, showsSpecialization, showsRole, showsCompany, AUDIENCE_COPY } =
  audienceRules(CURRENT);
