import type { Trait } from "@/content/mini-ipip";
import { careerRoleLabel, EXTRA_CAREER_ROLE_IDS, type ExtraCareerRole } from "@/features/direction/career-roles";
import { majorFamily, usesEngineeringDirection, type MajorFamily } from "@/features/majors/catalog";
import { joinParts, majorPart, type ReasonPart } from "@/features/direction/explain";
import { showsRole } from "@/lib/audience";
import type { TraitScores } from "@/features/profile/scoring";
import { roleLabel, ROLE_TYPE_VALUES, type RoleType } from "@/features/review/roles";
import {
  DATA,
  DESIGN,
  EXTRA_RULES,
  FAMILY_SUGGESTIONS,
  FIELD,
  FILL_ORDER,
  PROCESS,
  RESEARCH_MAJORS,
  RULES,
  SOFTWARE,
  type CareerRole,
  type QuizRule,
} from "@/features/direction/rule-data";

/**
 * Direction copy (founder rule, Nov 21, 2026): speak confidently about how the
 * student's own answers fit a role. Say nothing about what other students do
 * unless the sentence carries a computed number and at least 2 students.
 * Never claim certainty ("proven", "guaranteed", "this is your career").
 */

/** Shown for rule-based suggestions. */
export const DIRECTION_RULES_LABEL = "Roles that fit how you work, based on your quiz and your major.";

/** Shown when at least one role has enough independent student evidence. */
export const DIRECTION_EVIDENCE_LABEL =
  "Roles that fit how you work. Some are backed by co-op reviews from students with profiles like yours.";

export const DIRECTION_QUIZ_LABEL = "Roles that fit how you work, based on your quiz.";

export const DIRECTION_INSUFFICIENT_LABEL =
  "No role stands out from your answers yet. Add your major on your profile, or browse the career map.";

/** Shown when the student has set aside every role Swervly can suggest right now. */
export const DIRECTION_EXHAUSTED_LABEL =
  "You've set aside every role Swervly can suggest from your quiz and major right now.";

/** Empty-state body on Direction and Home when every suggestion was dismissed. */
export const DIRECTION_EXHAUSTED_ACTION =
  "Retake the quiz if your answers have changed, or browse the career map to find a direction on your own.";

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

/** Label on suggestions that come from the quiz and major rules. */
export const RULES_EVIDENCE_LABEL = "Matched to your quiz and major";

/** Label when the role is only a generic fill / always-on fallback, not a quiz signal. */
export const FALLBACK_EVIDENCE_LABEL = "A solid place to start";

export type Goal = "industry" | "grad_school" | "undecided";

export type DirectionContext = {
  traits: TraitScores;
  major: string;
  goal: Goal;
};

export type DirectionSuggestion = {
  roleType: RoleType | ExtraCareerRole;
  roleLabel: string;
  /** All of `parts` as one line, for places that show a single sentence. */
  reason: string;
  /** The reason split by where it comes from: quiz, major, goal, reviews or a neutral start. */
  parts: ReasonPart[];
  source: "rules" | "similar_students";
  /** Distinct similar students behind an evidence-backed suggestion. */
  sampleSize?: number;
  evidenceLabel?: string;
  /** "Why this matched": `parts` first, then lines from the student's priorities (item 20). */
  explanation?: ReasonPart[];
};

export type SimilarReview = {
  userId: string;
  traits: TraitScores;
  roleType: RoleType;
  enjoyment: number;
};

/**
 * Neutral reasons for roles that fill the list when fewer than three rules matched.
 * No rule matched these, so the copy describes the role only: never the student's
 * quiz answers, major, or "top matches".
 */
const FILL_REASONS: Partial<Record<RoleType, string>> = {
  design: "Design work is a common engineering co-op path and a solid place to start.",
  test_validation: "Test and validation is a core engineering co-op and a solid place to start.",
  software: "Software work is a common engineering co-op path and a solid place to start.",
  manufacturing_process: "Manufacturing and process work is a common engineering co-op path and a solid place to start.",
  data_analytics: "Data and analytics work shows up across many engineering co-ops and is a solid place to start.",
  research: "Research roles appear in many engineering paths and are a solid place to start.",
  field_site: "Field and site work is a common engineering co-op path and a solid place to start.",
};

/** Exported for tests: fill copy must stay role-neutral (no quiz/major matching claims). */
export function fillReason(role: RoleType): string {
  return FILL_REASONS[role] ?? `${roleLabel(role)} is a common engineering co-op path and a solid place to start.`;
}

export function traitDistance(left: TraitScores, right: TraitScores): number {
  const traits = Object.keys(left) as Trait[];
  const sum = traits.reduce((total, trait) => {
    const delta = left[trait] - right[trait];
    return total + delta * delta;
  }, 0);
  return Math.sqrt(sum);
}

function asSuggestion(role: CareerRole, parts: ReasonPart[], evidenceLabel = RULES_EVIDENCE_LABEL): DirectionSuggestion {
  return { roleType: role, roleLabel: careerRoleLabel(role), reason: joinParts(parts), parts, source: "rules", evidenceLabel };
}

/** A matched rule's lines: the quiz half, the goal half, then the major's coursework line. */
function ruleParts(rule: QuizRule, context: DirectionContext): ReasonPart[] {
  if (rule.fallback) return [{ kind: "general", text: rule.reason }];
  const parts: ReasonPart[] = [];
  if (rule.reason) parts.push({ kind: "quiz", text: rule.reason });
  if (rule.goal) parts.push({ kind: "goal", text: rule.goal });
  if (rule.major) parts.push(majorPart(context.major, rule.role));
  return parts;
}

const general = (text: string): ReasonPart[] => [{ kind: "general", text }];

const NOTHING_HIDDEN: ReadonlySet<string> = new Set();

const EXTRA_ROLE_ORDER: readonly ExtraCareerRole[] = EXTRA_CAREER_ROLE_IDS.filter(
  (role): role is ExtraCareerRole => role !== "insufficient",
);

/** Tie-break order when two roles score the same: co-op roles, then the other career roles. */
const ROLE_ORDER: readonly CareerRole[] = [...ROLE_TYPE_VALUES.filter((role) => role !== "other"), ...EXTRA_ROLE_ORDER];

/** `fallback`: the rule is a generic fallback, not a quiz signal (see QuizRule.fallback). */
type Match = { points: number; parts: ReasonPart[]; fallback: boolean };

/**
 * The strongest matching rule for each role. Skips roles in `skip` (dismissed) and
 * roles hidden for the current audience (src/lib/audience.ts).
 */
function bestByRole(rules: readonly QuizRule[], context: DirectionContext, skip: ReadonlySet<string> = NOTHING_HIDDEN) {
  const best = new Map<CareerRole, Match>();
  for (const rule of rules) {
    if (skip.has(rule.role) || !showsRole(rule.role) || !rule.when(context)) continue;
    const current = best.get(rule.role);
    if (!current || rule.points > current.points) {
      best.set(rule.role, { points: rule.points, parts: ruleParts(rule, context), fallback: rule.fallback === true });
    }
  }
  return best;
}

/** Highest points first; ties in ROLE_ORDER. */
function ranked(matches: ReadonlyMap<CareerRole, Match>): [CareerRole, Match][] {
  return [...matches.entries()].sort(
    (left, right) => right[1].points - left[1].points || ROLE_ORDER.indexOf(left[0]) - ROLE_ORDER.indexOf(right[0]),
  );
}

/** Quiz signals for the non-engineering engine. Engineering rules only when asked, never the fallback. */
function quizMatches(context: DirectionContext, withEngineering: boolean): Map<CareerRole, Match> {
  return bestByRole(withEngineering ? [...RULES.filter((rule) => !rule.fallback), ...EXTRA_RULES] : EXTRA_RULES, context);
}

/**
 * A major outside the engineering co-op rules. The major picks the roles on the
 * table; the quiz orders them, and may fill the last slot with another
 * non-engineering role when it points there more strongly. Engineering roles
 * only appear when the major's own list includes them (computing, math, science).
 */
function majorFamilySuggestions(
  context: DirectionContext,
  rows: readonly { role: CareerRole; reason: string }[],
  hidden: ReadonlySet<string>,
): DirectionSuggestion[] {
  const quiz = quizMatches(context, false);
  const pointsOf = (role: CareerRole) => quiz.get(role)?.points ?? 0;
  const familyRoles = rows.map((row) => row.role);
  const ordered = rows
    .map((row, index) => ({ row, index }))
    .filter((item) => !hidden.has(item.row.role))
    .sort((left, right) => pointsOf(right.row.role) - pointsOf(left.row.role) || left.index - right.index)
    .map((item) => item.row);

  const familyReason = (row: { role: CareerRole; reason: string }): ReasonPart[] => {
    const match = quiz.get(row.role);
    return match
      ? [...match.parts, { kind: "major", text: "Your major points here too." }]
      : [{ kind: "major", text: row.reason }];
  };

  const chosen = ordered.slice(0, 2).map((row) => asSuggestion(row.role, familyReason(row)));
  const outside = EXTRA_ROLE_ORDER.filter((role) => !familyRoles.includes(role) && !hidden.has(role) && pointsOf(role) > 0);
  // Best remaining by quiz points; ties go to the major's own roles, then editorial order.
  // When the student dismissed some of the major's roles, the next best fill the empty slots.
  const candidates = [
    ...ordered.slice(2).map((row) => ({ role: row.role, points: pointsOf(row.role), parts: familyReason(row) })),
    ...outside.map((role) => ({
      role,
      points: pointsOf(role),
      parts: [
        ...(quiz.get(role)?.parts ?? []),
        { kind: "major", text: "It's outside your major's usual paths, but it fits how you work." },
      ] as ReasonPart[],
    })),
  ];
  while (chosen.length < 3 && candidates.length > 0) {
    const bestIndex = candidates.reduce((best, item, index) => (item.points > candidates[best].points ? index : best), 0);
    const [next] = candidates.splice(bestIndex, 1);
    chosen.push(asSuggestion(next.role, next.parts));
  }
  return chosen;
}

/** Undecided, custom or unknown major: the quiz alone, across every role. */
function quizOnlySuggestions(context: DirectionContext, hidden: ReadonlySet<string>): DirectionSuggestion[] {
  return ranked(quizMatches(context, true))
    .filter(([role]) => !hidden.has(role))
    .slice(0, 3)
    .map(([role, match]) => asSuggestion(role, match.parts));
}

function insufficientSuggestion(): DirectionSuggestion {
  return {
    roleType: "insufficient",
    roleLabel: careerRoleLabel("insufficient"),
    reason: DIRECTION_INSUFFICIENT_LABEL,
    parts: general(DIRECTION_INSUFFICIENT_LABEL),
    source: "rules",
    evidenceLabel: "Not enough information",
  };
}

/** The major's own role list, without roles hidden for the current audience (src/lib/audience.ts). */
function familyRows(major: string): readonly { role: CareerRole; reason: string }[] {
  return (FAMILY_SUGGESTIONS[majorFamily(major)] ?? []).filter((row) => showsRole(row.role));
}

function nonEngineeringSuggestions(context: DirectionContext, hidden: ReadonlySet<string>): DirectionSuggestion[] {
  const rows = familyRows(context.major);
  const pick = (skip: ReadonlySet<string>) =>
    rows.length > 0 ? majorFamilySuggestions(context, rows, skip) : quizOnlySuggestions(context, skip);
  const chosen = pick(hidden);
  if (chosen.length > 0) return chosen;
  // Nothing left only because the student dismissed it all: no "not enough information" card.
  if (hidden.size > 0 && pick(NOTHING_HIDDEN).length > 0) return [];
  return [insufficientSuggestion()];
}

const ENGINEERING_RULE_MAJORS = [SOFTWARE, DESIGN, PROCESS, DATA, FIELD, RESEARCH_MAJORS];

function keepsEngineeringCoopRules(major: string): boolean {
  return usesEngineeringDirection(major) || ENGINEERING_RULE_MAJORS.some((majors) => majors.has(major));
}

/**
 * Up to three rule-based suggestions. Roles in `dismissed` are skipped, so the
 * next-best role takes a dismissed role's place. An empty list means the student
 * dismissed everything this engine can suggest.
 */
export function suggestionsFromRules(context: DirectionContext, dismissed: readonly string[] = []): DirectionSuggestion[] {
  const hidden: ReadonlySet<string> = new Set(dismissed);
  if (!keepsEngineeringCoopRules(context.major)) return nonEngineeringSuggestions(context, hidden);

  const chosen = ranked(bestByRole(RULES, context, hidden))
    .slice(0, 3)
    .map(([role, match]) => asSuggestion(role, match.parts, match.fallback ? FALLBACK_EVIDENCE_LABEL : RULES_EVIDENCE_LABEL));
  // Fewer than three matched: fill from the core co-op roles.
  for (const role of FILL_ORDER) {
    if (chosen.length === 3) break;
    if (hidden.has(role) || chosen.some((item) => item.roleType === role)) continue;
    chosen.push(asSuggestion(role, general(fillReason(role)), FALLBACK_EVIDENCE_LABEL));
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
  return evidenceBackedRoles(self, reviews).map((row) => {
    const text = `${row.sampleSize} students with profiles like yours rated co-ops in this role ${row.meanEnjoyment.toFixed(1)}/5 for enjoyment.`;
    return {
      roleType: row.roleType,
      roleLabel: roleLabel(row.roleType),
      reason: text,
      parts: [{ kind: "reviews", text }] as ReasonPart[],
      source: "similar_students" as const,
      sampleSize: row.sampleSize,
      evidenceLabel: `Backed by ${row.sampleSize} students`,
    };
  });
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
  // Audience-hidden roles are filtered here, not added to `hidden`: `hidden` means "the student dismissed it".
  const evidence = suggestionsFromSimilar(context.traits, reviews).filter(
    (item) => showsRole(item.roleType) && !hidden.has(item.roleType),
  );
  if (!keepsEngineeringCoopRules(context.major)) {
    const rows = familyRows(context.major);
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

