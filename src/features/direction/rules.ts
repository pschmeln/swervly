import type { Trait } from "@/content/mini-ipip";
import { careerRoleLabel, type ExtraCareerRole } from "@/features/direction/career-roles";
import { majorFamily, usesEngineeringDirection, type MajorFamily } from "@/features/majors/catalog";
import type { TraitScores } from "@/features/profile/scoring";
import { traitBand } from "@/features/profile/traits";
import { roleLabel, ROLE_TYPE_VALUES, type RoleType } from "@/features/review/roles";

/** Shown for rule-based early hypotheses. */
export const DIRECTION_RULES_LABEL =
  "Worth exploring — early hypotheses from your quiz and major. Not a career diagnosis.";

/** Shown when at least one role has enough independent student evidence. */
export const DIRECTION_EVIDENCE_LABEL =
  "Worth exploring — some roles below use student reviews; others are still early hypotheses.";

export const DIRECTION_MAJOR_GOAL_LABEL =
  "Worth exploring — early hypotheses from your major and stated goal. Not a career diagnosis, and not a fit score.";

export const DIRECTION_INSUFFICIENT_LABEL =
  "Not enough information for a role suggestion. Quiz scores are not a career-fit score.";

export const SIMILAR_MAX_DISTANCE = 6;

/** Distinct similar students required for one role before it is evidence-backed. */
export const MIN_DISTINCT_STUDENTS_PER_ROLE = 3;

export const RULES_REASON_PREFIX = "Early hypothesis:";
export const EVIDENCE_REASON_PREFIX = "Worth exploring:";

export type Goal = "industry" | "grad_school" | "undecided";

export type DirectionContext = {
  traits: TraitScores;
  major: string;
  goal: Goal;
};

export type DirectionSuggestion = {
  roleType: RoleType | ExtraCareerRole;
  roleLabel: string;
  reason: string;
  source: "rules" | "similar_students";
  /** Distinct similar students behind an evidence-backed suggestion. */
  sampleSize?: number;
  evidenceLabel?: string;
};

export type SimilarReview = {
  userId: string;
  traits: TraitScores;
  roleType: RoleType;
  enjoyment: number;
};

type Rule = {
  role: RoleType;
  points: number;
  when: (context: DirectionContext) => boolean;
  reason: string;
};

const SOFTWARE = new Set([
  "Computer Engineering",
  "Computer Science",
  "Cybersecurity Engineering",
  "Electrical Engineering",
]);
const DESIGN = new Set([
  "Mechanical Engineering",
  "Aerospace Engineering",
  "Architectural Engineering",
  "Civil Engineering",
  "Biomedical Engineering",
  "Engineering Technology",
  "Industrial & Systems Engineering",
]);
const PROCESS = new Set([
  "Chemical Engineering",
  "Industrial & Systems Engineering",
  "Mechanical Engineering",
  "Engineering Technology",
]);
const DATA = new Set([
  "Computer Science",
  "Computer Engineering",
  "Electrical Engineering",
  "Industrial & Systems Engineering",
]);
const FIELD = new Set([
  "Civil Engineering",
  "Environmental Engineering",
  "Construction Management",
  "Architectural Engineering",
]);
const RESEARCH_MAJORS = new Set([
  "Biomedical Engineering",
  "Chemical Engineering",
  "Electrical Engineering",
  "Computer Science",
]);

const RULES: readonly Rule[] = [
  {
    role: "design",
    points: 3,
    when: (context) => traitBand(context.traits.openness) === "high" && DESIGN.has(context.major),
    reason: "You like unfamiliar problems, and your major lines up with design work.",
  },
  {
    role: "design",
    points: 2,
    when: (context) =>
      traitBand(context.traits.openness) === "high" &&
      traitBand(context.traits.conscientiousness) !== "low",
    reason: "You like new problems and you can carry a plan through.",
  },
  {
    role: "test_validation",
    points: 3,
    when: (context) =>
      traitBand(context.traits.conscientiousness) === "high" &&
      traitBand(context.traits.openness) !== "high",
    reason: "You like a plan, and you prefer checking a known method over inventing one.",
  },
  {
    role: "test_validation",
    points: 2,
    when: (context) =>
      traitBand(context.traits.conscientiousness) === "high" &&
      traitBand(context.traits.neuroticism) === "low",
    reason: "You stay steady and thorough, which fits test and validation work.",
  },
  {
    role: "manufacturing_process",
    points: 3,
    when: (context) => PROCESS.has(context.major) && traitBand(context.traits.conscientiousness) !== "low",
    reason: "Your major and the way you follow a plan line up with process work.",
  },
  {
    role: "manufacturing_process",
    points: 2,
    when: (context) => context.goal === "industry" && traitBand(context.traits.conscientiousness) === "high",
    reason: "You want industry work, and you like a process you can tighten.",
  },
  {
    role: "software",
    points: 3,
    when: (context) => SOFTWARE.has(context.major),
    reason: "Your major lines up with software, so that is the starting guess.",
  },
  {
    role: "software",
    points: 2,
    when: (context) => traitBand(context.traits.openness) === "high" && SOFTWARE.has(context.major),
    reason: "You like new problems, and your major is close to software.",
  },
  {
    role: "data_analytics",
    points: 3,
    when: (context) =>
      DATA.has(context.major) &&
      traitBand(context.traits.conscientiousness) !== "low" &&
      traitBand(context.traits.openness) !== "low",
    reason: "You can follow a method and still dig into a new question, which fits data work.",
  },
  {
    role: "data_analytics",
    points: 2,
    when: (context) =>
      traitBand(context.traits.conscientiousness) === "high" && traitBand(context.traits.openness) === "high",
    reason: "You like both a careful process and an unfamiliar question.",
  },
  {
    role: "research",
    points: 3,
    when: (context) => context.goal === "grad_school" && traitBand(context.traits.openness) !== "low",
    reason: "Graduate school is your goal, and you are open to unfamiliar questions.",
  },
  {
    role: "research",
    points: 2,
    when: (context) =>
      RESEARCH_MAJORS.has(context.major) &&
      traitBand(context.traits.openness) === "high" &&
      traitBand(context.traits.extraversion) !== "high",
    reason: "You like new ideas and quieter focus, which fits research.",
  },
  {
    role: "field_site",
    points: 3,
    when: (context) => FIELD.has(context.major) && traitBand(context.traits.extraversion) !== "low",
    reason: "Your major often means site work, and you are comfortable around people.",
  },
  {
    role: "field_site",
    points: 2,
    when: (context) =>
      traitBand(context.traits.extraversion) === "high" && traitBand(context.traits.agreeableness) !== "low",
    reason: "You gain energy around people, which fits field and site roles.",
  },
  {
    role: "design",
    points: 1,
    when: (context) => traitBand(context.traits.openness) === "high",
    reason: "You like unfamiliar problems, so design is a reasonable first guess.",
  },
  {
    role: "test_validation",
    points: 1,
    when: () => true,
    reason: "Checking whether something works is a common co-op, and a fair first guess.",
  },
];

const FILL_ORDER: readonly RoleType[] = [
  "design",
  "test_validation",
  "software",
  "manufacturing_process",
  "data_analytics",
  "research",
  "field_site",
];

function withRulesLabel(reason: string): string {
  return `${RULES_REASON_PREFIX} ${reason}`;
}

function fillReason(role: RoleType, context: DirectionContext): string {
  const open = traitBand(context.traits.openness);
  if (role === "design") return "Design is a reasonable next guess from how you handle new problems.";
  if (role === "test_validation") return "Test and validation is a reasonable next guess from how you like to check work.";
  if (role === "software") {
    return open === "high"
      ? "Software is a reasonable next guess because you like unfamiliar problems."
      : "Software is a reasonable next guess for the kind of work your major sees.";
  }
  if (role === "manufacturing_process") return "Manufacturing and process work is a reasonable next guess from how you follow a plan.";
  if (role === "data_analytics") return "Data and analytics is a reasonable next guess when you like both a method and a question.";
  if (role === "research") return "Research is a reasonable next guess from how open you are to unfamiliar questions.";
  return "Field and site work is a reasonable next guess from how you like being around the work itself.";
}

export function traitDistance(left: TraitScores, right: TraitScores): number {
  const traits = Object.keys(left) as Trait[];
  const sum = traits.reduce((total, trait) => {
    const delta = left[trait] - right[trait];
    return total + delta * delta;
  }, 0);
  return Math.sqrt(sum);
}

const FAMILY_SUGGESTIONS: Partial<
  Record<MajorFamily, { role: RoleType | ExtraCareerRole; reason: string }[]>
> = {
  business: [
    { role: "business_operations", reason: "Your major is in business, so operations is a place to explore. This is not a fit score." },
    { role: "marketing", reason: "Marketing is worth exploring from a business major. This is not a fit score." },
    { role: "finance", reason: "Finance is worth exploring from a business major. This is not a fit score." },
  ],
  economics: [
    { role: "finance", reason: "Your major lines up with finance work worth exploring. This is not a fit score." },
    { role: "policy_research", reason: "Policy work is worth exploring from economics. This is not a fit score." },
    { role: "business_operations", reason: "Operations is a related path worth exploring. This is not a fit score." },
  ],
  healthcare: [
    { role: "healthcare_clinical", reason: "Your major is in healthcare, so clinical work is a place to explore. This is not a fit score." },
    { role: "healthcare_admin", reason: "Healthcare administration is worth exploring from your major. This is not a fit score." },
  ],
  natural_science: [
    { role: "laboratory", reason: "Your major is in the sciences, so laboratory work is a place to explore. This is not a fit score." },
    { role: "research", reason: "Research is worth exploring from a science major. This is not a fit score." },
  ],
  social_science: [
    { role: "policy_research", reason: "Policy and research-style work is worth exploring from your major. This is not a fit score." },
    { role: "counseling_support", reason: "Counseling and support work is worth exploring from your major. This is not a fit score." },
  ],
  education: [
    { role: "teaching", reason: "Your major is in education, so teaching is a place to explore. This is not a fit score." },
    { role: "counseling_support", reason: "Student support work is worth exploring from an education major. This is not a fit score." },
  ],
  arts_humanities: [
    { role: "writing_media", reason: "Writing and media work is worth exploring from your major. This is not a fit score." },
    { role: "teaching", reason: "Teaching is a related path worth exploring. This is not a fit score." },
  ],
  communication: [
    { role: "writing_media", reason: "Your major lines up with writing and media work worth exploring. This is not a fit score." },
    { role: "marketing", reason: "Marketing is a related path worth exploring. This is not a fit score." },
  ],
  math: [
    { role: "data_analytics", reason: "Your major lines up with data work worth exploring. This is not a fit score." },
    { role: "research", reason: "Research is worth exploring from a math major. This is not a fit score." },
  ],
  interdisciplinary: [
    { role: "policy_research", reason: "Research-style work is one place to explore from an interdisciplinary major. This is not a fit score." },
    { role: "writing_media", reason: "Writing is another place to explore. This is not a fit score." },
  ],
};

function asSuggestion(role: RoleType | ExtraCareerRole, reason: string): DirectionSuggestion {
  return {
    roleType: role,
    roleLabel: careerRoleLabel(role),
    reason: withRulesLabel(reason),
    source: "rules",
    evidenceLabel: "Early hypothesis",
  };
}

function nonEngineeringSuggestions(context: DirectionContext): DirectionSuggestion[] {
  const family = majorFamily(context.major);
  const rows = FAMILY_SUGGESTIONS[family] ?? [];
  const chosen = rows.slice(0, 3).map((row) => asSuggestion(row.role, row.reason));
  if (
    context.goal === "grad_school" &&
    family !== "unknown" &&
    !chosen.some((item) => item.roleType === "research")
  ) {
    chosen.unshift(
      asSuggestion(
        "research",
        "You said graduate school is a goal, so research is worth exploring. This is not a fit score.",
      ),
    );
  }
  if (chosen.length === 0) {
    return [
      {
        roleType: "insufficient",
        roleLabel: careerRoleLabel("insufficient"),
        reason: withRulesLabel(
          "There isn't enough information to suggest a role yet. Quiz scores are not a career-fit score.",
        ),
        source: "rules",
        evidenceLabel: "Not enough information",
      },
    ];
  }
  return chosen.slice(0, 3);
}

export function suggestionsFromRules(context: DirectionContext): DirectionSuggestion[] {
  if (!usesEngineeringDirection(context.major)) return nonEngineeringSuggestions(context);
  const scored = new Map<RoleType, { points: number; reason: string }>();
  for (const rule of RULES) {
    if (!rule.when(context)) continue;
    const current = scored.get(rule.role);
    if (!current || rule.points > current.points) {
      scored.set(rule.role, { points: rule.points, reason: rule.reason });
    }
  }

  const ranked = [...scored.entries()].sort((left, right) => {
    if (right[1].points !== left[1].points) return right[1].points - left[1].points;
    return ROLE_TYPE_VALUES.indexOf(left[0]) - ROLE_TYPE_VALUES.indexOf(right[0]);
  });

  const chosen: DirectionSuggestion[] = [];
  for (const [roleType, row] of ranked) {
    if (roleType === "other") continue;
    chosen.push({
      roleType,
      roleLabel: roleLabel(roleType),
      reason: withRulesLabel(row.reason),
      source: "rules",
      evidenceLabel: "Early hypothesis",
    });
    if (chosen.length === 3) return chosen;
  }

  for (const roleType of FILL_ORDER) {
    if (chosen.some((item) => item.roleType === roleType)) continue;
    chosen.push({
      roleType,
      roleLabel: roleLabel(roleType),
      reason: withRulesLabel(fillReason(roleType, context)),
      source: "rules",
      evidenceLabel: "Early hypothesis",
    });
    if (chosen.length === 3) break;
  }
  return chosen;
}

type RoleEvidence = {
  roleType: RoleType;
  sampleSize: number;
  meanEnjoyment: number;
};

/**
 * Evidence-backed roles only. A role qualifies when at least
 * MIN_DISTINCT_STUDENTS_PER_ROLE distinct similar students reviewed that role.
 * Multiple reviews from one student count once for that role.
 */
export function evidenceBackedRoles(
  self: TraitScores,
  reviews: readonly SimilarReview[],
): RoleEvidence[] {
  const close = reviews.filter(
    (review) => traitDistance(self, review.traits) <= SIMILAR_MAX_DISTANCE && review.roleType !== "other",
  );

  const byRole = new Map<RoleType, Map<string, number>>();
  for (const review of close) {
    const students = byRole.get(review.roleType) ?? new Map<string, number>();
    const previous = students.get(review.userId);
    if (previous == null) {
      students.set(review.userId, review.enjoyment);
    } else {
      students.set(review.userId, (previous + review.enjoyment) / 2);
    }
    byRole.set(review.roleType, students);
  }

  const qualified: RoleEvidence[] = [];
  for (const [roleType, students] of byRole) {
    if (students.size < MIN_DISTINCT_STUDENTS_PER_ROLE) continue;
    const values = [...students.values()];
    const meanEnjoyment = values.reduce((sum, value) => sum + value, 0) / values.length;
    qualified.push({ roleType, sampleSize: students.size, meanEnjoyment });
  }

  return qualified.sort((left, right) => {
    if (right.meanEnjoyment !== left.meanEnjoyment) return right.meanEnjoyment - left.meanEnjoyment;
    if (right.sampleSize !== left.sampleSize) return right.sampleSize - left.sampleSize;
    return ROLE_TYPE_VALUES.indexOf(left.roleType) - ROLE_TYPE_VALUES.indexOf(right.roleType);
  });
}

export function suggestionsFromSimilar(
  self: TraitScores,
  reviews: readonly SimilarReview[],
): DirectionSuggestion[] {
  return evidenceBackedRoles(self, reviews).map((row) => ({
    roleType: row.roleType,
    roleLabel: roleLabel(row.roleType),
    reason: `${EVIDENCE_REASON_PREFIX} ${row.sampleSize} students with profiles near yours rated this role highly. Similarity is not proof of career fit.`,
    source: "similar_students" as const,
    sampleSize: row.sampleSize,
    evidenceLabel: `Student evidence · n=${row.sampleSize}`,
  }));
}

export function buildDirection(
  context: DirectionContext,
  reviews: readonly SimilarReview[],
): { label: string; basis: "rules" | "similar_students" | "mixed"; suggestions: DirectionSuggestion[] } {
  const fromRules = suggestionsFromRules(context);
  if (!usesEngineeringDirection(context.major)) {
    const concrete = fromRules.some((item) => item.roleType !== "insufficient");
    return {
      label: concrete ? DIRECTION_MAJOR_GOAL_LABEL : DIRECTION_INSUFFICIENT_LABEL,
      basis: "rules",
      suggestions: fromRules,
    };
  }

  const fromStudents = suggestionsFromSimilar(context.traits, reviews);

  if (fromStudents.length === 0) {
    return { label: DIRECTION_RULES_LABEL, basis: "rules", suggestions: fromRules };
  }

  const suggestions: DirectionSuggestion[] = [];
  for (const evidence of fromStudents) {
    if (suggestions.length === 3) break;
    suggestions.push(evidence);
  }
  for (const rule of fromRules) {
    if (suggestions.length === 3) break;
    if (suggestions.some((item) => item.roleType === rule.roleType)) continue;
    suggestions.push(rule);
  }

  const hasRules = suggestions.some((item) => item.source === "rules");
  const hasEvidence = suggestions.some((item) => item.source === "similar_students");
  const basis = hasRules && hasEvidence ? "mixed" : hasEvidence ? "similar_students" : "rules";
  const label =
    basis === "rules"
      ? DIRECTION_RULES_LABEL
      : DIRECTION_EVIDENCE_LABEL;

  return {
    label,
    basis,
    suggestions: suggestions.slice(0, 3),
  };
}

/** @deprecated Prefer DIRECTION_RULES_LABEL / DIRECTION_EVIDENCE_LABEL. */
export const DIRECTION_LABEL = DIRECTION_RULES_LABEL;
/** @deprecated Prefer evidence wording with sample size. */
export const SIMILAR_STUDENT_REASON =
  "Worth exploring: students with profiles near yours rated this role highly. Similarity is not proof of career fit.";
