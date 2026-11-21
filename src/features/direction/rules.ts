import type { Trait } from "@/content/mini-ipip";
import { careerRoleLabel, EXTRA_CAREER_ROLE_IDS, type ExtraCareerRole } from "@/features/direction/career-roles";
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

export const DIRECTION_QUIZ_LABEL =
  "Worth exploring — early hypotheses from your quiz. Not a career diagnosis, and not a fit score.";

export const DIRECTION_INSUFFICIENT_LABEL =
  "Not enough information for a role suggestion. Quiz scores are not a career-fit score.";

/** Shown when the student has set aside every role Swervly can suggest right now. */
export const DIRECTION_EXHAUSTED_LABEL =
  "You've set aside every role Swervly can suggest from your quiz and major right now.";

export type DirectionResult = {
  label: string;
  basis: "rules" | "similar_students" | "mixed";
  suggestions: DirectionSuggestion[];
  /** True when suggestions ran out because the student dismissed them, not for lack of information. */
  exhausted: boolean;
};

export const SIMILAR_MAX_DISTANCE = 6;

/** Distinct similar students required for one role before it is evidence-backed. */
export const MIN_DISTINCT_STUDENTS_PER_ROLE = 2;

/**
 * Average enjoyment (1-5) the similar students must give a role before it counts as
 * evidence. The student-facing text says they "rated this role highly", so a role
 * below this is never shown as evidence, however many students reviewed it.
 */
export const MIN_MEAN_ENJOYMENT = 4;

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
  /** Matches everyone. Used to fill engineering suggestions, never as a quiz signal. */
  fallback?: true;
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
    fallback: true,
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
  computing: [
    { role: "software", reason: "Your major is in computing, so software is a place to explore. This is not a fit score." },
    { role: "data_analytics", reason: "Data work is worth exploring from a computing major. This is not a fit score." },
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

type QuizRule = {
  role: RoleType | ExtraCareerRole;
  points: number;
  when: (context: DirectionContext) => boolean;
  reason: string;
};

/**
 * Quiz rules for roles outside the engineering co-op table (editorial, like RULES).
 * Early hypotheses from Big Five bands, not a validated career assessment.
 */
const EXTRA_RULES: readonly QuizRule[] = [
  {
    role: "healthcare_clinical",
    points: 3,
    when: (c) => traitBand(c.traits.agreeableness) === "high" && traitBand(c.traits.extraversion) !== "low",
    reason: "You look out for people and are comfortable around them, which fits hands-on care.",
  },
  {
    role: "healthcare_clinical",
    points: 2,
    when: (c) => traitBand(c.traits.conscientiousness) === "high" && traitBand(c.traits.neuroticism) === "low",
    reason: "You stay steady and careful, which clinical work asks for.",
  },
  {
    role: "healthcare_admin",
    points: 3,
    when: (c) => traitBand(c.traits.conscientiousness) === "high" && traitBand(c.traits.extraversion) !== "high",
    reason: "You like a plan and steady, organized work, which fits healthcare administration.",
  },
  {
    role: "teaching",
    points: 3,
    when: (c) => traitBand(c.traits.extraversion) === "high" && traitBand(c.traits.agreeableness) === "high",
    reason: "You gain energy around people and look out for them, which fits teaching.",
  },
  {
    role: "counseling_support",
    points: 3,
    when: (c) => traitBand(c.traits.agreeableness) === "high" && traitBand(c.traits.neuroticism) !== "high",
    reason: "You look out for people and stay steady, which fits support work.",
  },
  {
    role: "business_operations",
    points: 3,
    when: (c) => traitBand(c.traits.conscientiousness) === "high" && traitBand(c.traits.extraversion) !== "low",
    reason: "You like a plan and you work well with people, which fits operations.",
  },
  {
    role: "finance",
    points: 2,
    when: (c) => traitBand(c.traits.conscientiousness) === "high" && traitBand(c.traits.openness) !== "high",
    reason: "You like a careful, known method, which fits finance work.",
  },
  {
    role: "marketing",
    points: 3,
    when: (c) => traitBand(c.traits.extraversion) === "high" && traitBand(c.traits.openness) === "high",
    reason: "You like new ideas and being around people, which fits marketing.",
  },
  {
    role: "laboratory",
    points: 2,
    when: (c) => traitBand(c.traits.conscientiousness) === "high" && traitBand(c.traits.extraversion) !== "high",
    reason: "You're careful and you like focused work, which fits lab work.",
  },
  {
    role: "policy_research",
    points: 3,
    when: (c) => c.goal === "grad_school" && traitBand(c.traits.openness) === "high",
    reason: "Graduate school is your goal, and you like unfamiliar questions.",
  },
  {
    role: "policy_research",
    points: 2,
    when: (c) => traitBand(c.traits.openness) === "high" && traitBand(c.traits.extraversion) !== "high",
    reason: "You like new ideas and quieter focus, which fits research-style work.",
  },
  {
    role: "writing_media",
    points: 3,
    when: (c) => traitBand(c.traits.openness) === "high" && traitBand(c.traits.extraversion) !== "high",
    reason: "You like new ideas and quieter focus, which fits writing.",
  },
];

const EXTRA_ROLE_ORDER: readonly ExtraCareerRole[] = EXTRA_CAREER_ROLE_IDS.filter(
  (role): role is ExtraCareerRole => role !== "insufficient",
);

const NOT_A_FIT_SCORE = "This is not a fit score.";

/** The strongest quiz rule that matches each role. Engineering rules only when asked. */
function quizMatches(
  context: DirectionContext,
  withEngineering: boolean,
): Map<RoleType | ExtraCareerRole, { points: number; reason: string }> {
  const best = new Map<RoleType | ExtraCareerRole, { points: number; reason: string }>();
  const rules: readonly QuizRule[] = withEngineering
    ? [...RULES.filter((rule) => !rule.fallback), ...EXTRA_RULES]
    : EXTRA_RULES;
  for (const rule of rules) {
    if (!rule.when(context)) continue;
    const current = best.get(rule.role);
    if (!current || rule.points > current.points) best.set(rule.role, { points: rule.points, reason: rule.reason });
  }
  return best;
}

/**
 * A major outside the engineering co-op rules. The major picks the roles on the
 * table; the quiz orders them, and may fill the last slot with another
 * non-engineering role when it points there more strongly. Engineering roles
 * only appear when the major's own list includes them (computing, math, science).
 */
function majorFamilySuggestions(
  context: DirectionContext,
  rows: readonly { role: RoleType | ExtraCareerRole; reason: string }[],
  hidden: ReadonlySet<string>,
): DirectionSuggestion[] {
  const quiz = quizMatches(context, false);
  const pointsOf = (role: RoleType | ExtraCareerRole) => quiz.get(role)?.points ?? 0;
  const familyRoles = rows.map((row) => row.role);
  const ordered = rows
    .map((row, index) => ({ row, index }))
    .filter((item) => !hidden.has(item.row.role))
    .sort((left, right) => pointsOf(right.row.role) - pointsOf(left.row.role) || left.index - right.index)
    .map((item) => item.row);

  const familyReason = (row: { role: RoleType | ExtraCareerRole; reason: string }) => {
    const match = quiz.get(row.role);
    return match ? `${match.reason} Your major points here too. ${NOT_A_FIT_SCORE}` : row.reason;
  };

  const chosen = ordered.slice(0, 2).map((row) => asSuggestion(row.role, familyReason(row)));
  const rest = ordered.slice(2);
  const outside = EXTRA_ROLE_ORDER.filter(
    (role) => !familyRoles.includes(role) && !hidden.has(role) && pointsOf(role) > 0,
  );
  // Best remaining by quiz points; ties go to the major's own roles, then editorial order.
  // When the student dismissed some of the major's roles, the next best fill the empty slots.
  const candidates = [
    ...rest.map((row) => ({ role: row.role, points: pointsOf(row.role), reason: familyReason(row) })),
    ...outside.map((role) => ({
      role,
      points: pointsOf(role),
      reason: `${quiz.get(role)?.reason ?? ""} It's outside your major's usual paths. ${NOT_A_FIT_SCORE}`,
    })),
  ];
  while (chosen.length < 3 && candidates.length > 0) {
    const bestIndex = candidates.reduce(
      (best, item, index) => (item.points > candidates[best].points ? index : best),
      0,
    );
    const [next] = candidates.splice(bestIndex, 1);
    chosen.push(asSuggestion(next.role, next.reason));
  }
  return chosen;
}

/** Undecided, custom or unknown major: the quiz alone, across every role. */
function quizOnlySuggestions(context: DirectionContext, hidden: ReadonlySet<string>): DirectionSuggestion[] {
  const quiz = quizMatches(context, true);
  const order: readonly (RoleType | ExtraCareerRole)[] = [...ROLE_TYPE_VALUES.filter((role) => role !== "other"), ...EXTRA_ROLE_ORDER];
  return [...quiz.entries()]
    .filter(([role]) => !hidden.has(role))
    .sort((left, right) => right[1].points - left[1].points || order.indexOf(left[0]) - order.indexOf(right[0]))
    .slice(0, 3)
    .map(([role, match]) => asSuggestion(role, `${match.reason} ${NOT_A_FIT_SCORE}`));
}

function insufficientSuggestion(): DirectionSuggestion {
  return {
    roleType: "insufficient",
    roleLabel: careerRoleLabel("insufficient"),
    reason: withRulesLabel(
      "There isn't enough information to suggest a role yet. Quiz scores are not a career-fit score.",
    ),
    source: "rules",
    evidenceLabel: "Not enough information",
  };
}

const NOTHING_HIDDEN: ReadonlySet<string> = new Set();

function nonEngineeringSuggestions(context: DirectionContext, hidden: ReadonlySet<string>): DirectionSuggestion[] {
  const family = majorFamily(context.major);
  const rows = FAMILY_SUGGESTIONS[family] ?? [];
  const pick = (skip: ReadonlySet<string>) =>
    rows.length > 0 ? majorFamilySuggestions(context, rows, skip) : quizOnlySuggestions(context, skip);
  const chosen = pick(hidden);
  if (chosen.length > 0) return chosen;
  // Nothing left only because the student dismissed it all: no "not enough information" card.
  if (hidden.size > 0 && pick(NOTHING_HIDDEN).length > 0) return [];
  return [insufficientSuggestion()];
}

function keepsEngineeringCoopRules(major: string): boolean {
  return (
    usesEngineeringDirection(major) ||
    SOFTWARE.has(major) ||
    DESIGN.has(major) ||
    PROCESS.has(major) ||
    DATA.has(major) ||
    FIELD.has(major) ||
    RESEARCH_MAJORS.has(major)
  );
}

/**
 * Up to three rule-based suggestions. Roles in `dismissed` are skipped, so the
 * next-best role takes a dismissed role's place. An empty list means the student
 * dismissed everything this engine can suggest.
 */
export function suggestionsFromRules(
  context: DirectionContext,
  dismissed: readonly string[] = [],
): DirectionSuggestion[] {
  const hidden: ReadonlySet<string> = new Set(dismissed);
  if (!keepsEngineeringCoopRules(context.major)) return nonEngineeringSuggestions(context, hidden);
  const scored = new Map<RoleType, { points: number; reason: string }>();
  for (const rule of RULES) {
    if (hidden.has(rule.role)) continue;
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
    if (hidden.has(roleType)) continue;
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
 * MIN_DISTINCT_STUDENTS_PER_ROLE distinct similar students reviewed that role
 * and their average enjoyment is at least MIN_MEAN_ENJOYMENT.
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
    if (meanEnjoyment < MIN_MEAN_ENJOYMENT) continue;
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

/**
 * Whose reviews can count as evidence for whom. Students only see evidence from
 * students in the same group of majors. Engineering and computing are one group,
 * as they share co-op roles. Undecided, custom and unknown majors have no group,
 * so they get no student evidence.
 */
export function evidenceGroup(major: string): MajorFamily | null {
  if (!major) return null;
  const family = majorFamily(major);
  if (family === "unknown") return null;
  return family === "computing" ? "engineering" : family;
}

/** Evidence first, then rule hypotheses that aren't already shown, three at most. */
function withEvidence(
  fromStudents: readonly DirectionSuggestion[],
  fromRules: readonly DirectionSuggestion[],
): DirectionResult {
  const suggestions: DirectionSuggestion[] = [];
  for (const evidence of fromStudents) {
    if (suggestions.length === 3) break;
    suggestions.push(evidence);
  }
  for (const rule of fromRules) {
    if (suggestions.length === 3) break;
    if (rule.roleType === "insufficient") continue;
    if (suggestions.some((item) => item.roleType === rule.roleType)) continue;
    suggestions.push(rule);
  }
  const hasRules = suggestions.some((item) => item.source === "rules");
  const basis = hasRules ? "mixed" : "similar_students";
  return { label: DIRECTION_EVIDENCE_LABEL, basis, suggestions, exhausted: false };
}

function exhaustedResult(): DirectionResult {
  return { label: DIRECTION_EXHAUSTED_LABEL, basis: "rules", suggestions: [], exhausted: true };
}

/**
 * Callers pass only reviews from students in the same evidence group
 * (see evidenceGroup). Outside engineering, evidence is also limited to the
 * roles the major's own list or the non-engineering roles cover, so an
 * engineering role never reaches a nursing student this way.
 *
 * Roles in `dismissed` never appear, from the rules or from student evidence.
 * The next-best role fills each dismissed slot. When nothing is left, the
 * result is `exhausted` with no suggestions.
 */
export function buildDirection(
  context: DirectionContext,
  reviews: readonly SimilarReview[],
  dismissed: readonly string[] = [],
): DirectionResult {
  const hidden = new Set(dismissed);
  const fromRules = suggestionsFromRules(context, dismissed);
  const evidence = suggestionsFromSimilar(context.traits, reviews).filter((item) => !hidden.has(item.roleType));
  if (!keepsEngineeringCoopRules(context.major)) {
    const rows = FAMILY_SUGGESTIONS[majorFamily(context.major)] ?? [];
    const quizOnly = rows.length === 0;
    const allowed = new Set<string>([...rows.map((row) => row.role), ...EXTRA_ROLE_ORDER]);
    const fromStudents = quizOnly ? [] : evidence.filter((item) => allowed.has(item.roleType));
    if (fromStudents.length > 0) return withEvidence(fromStudents, fromRules);
    if (fromRules.length === 0) return exhaustedResult();
    const concrete = fromRules.some((item) => item.roleType !== "insufficient");
    return {
      label: !concrete ? DIRECTION_INSUFFICIENT_LABEL : quizOnly ? DIRECTION_QUIZ_LABEL : DIRECTION_RULES_LABEL,
      basis: "rules",
      suggestions: fromRules,
      exhausted: false,
    };
  }

  const fromStudents = evidence;
  if (fromStudents.length === 0) {
    if (fromRules.length === 0) return exhaustedResult();
    return { label: DIRECTION_RULES_LABEL, basis: "rules", suggestions: fromRules, exhausted: false };
  }
  return withEvidence(fromStudents, fromRules);
}

/** @deprecated Prefer DIRECTION_RULES_LABEL / DIRECTION_EVIDENCE_LABEL. */
export const DIRECTION_LABEL = DIRECTION_RULES_LABEL;
/** @deprecated Prefer evidence wording with sample size. */
export const SIMILAR_STUDENT_REASON =
  "Worth exploring: students with profiles near yours rated this role highly. Similarity is not proof of career fit.";
