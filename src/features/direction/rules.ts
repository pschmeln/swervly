import type { Trait } from "@/content/mini-ipip";
import type { TraitScores } from "@/features/profile/scoring";
import { traitBand } from "@/features/profile/traits";
import { roleLabel, ROLE_TYPE_VALUES, type RoleType } from "@/features/review/roles";

export const DIRECTION_LABEL = "Our early guess, gets sharper as more students review";
export const SIMILAR_MAX_DISTANCE = 6;
export const SIMILAR_STUDENT_REASON = "Students with profiles like yours rated this highly.";

export type Goal = "industry" | "grad_school" | "undecided";

export type DirectionContext = {
  traits: TraitScores;
  major: string;
  goal: Goal;
};

export type DirectionSuggestion = {
  roleType: RoleType;
  roleLabel: string;
  reason: string;
  source: "rules" | "similar_students";
};

export type SimilarReview = {
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

export function suggestionsFromRules(context: DirectionContext): DirectionSuggestion[] {
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
      reason: row.reason,
      source: "rules",
    });
    if (chosen.length === 3) return chosen;
  }

  for (const roleType of FILL_ORDER) {
    if (chosen.some((item) => item.roleType === roleType)) continue;
    chosen.push({
      roleType,
      roleLabel: roleLabel(roleType),
      reason: fillReason(roleType, context),
      source: "rules",
    });
    if (chosen.length === 3) break;
  }
  return chosen;
}

export function suggestionsFromSimilar(
  self: TraitScores,
  reviews: readonly SimilarReview[],
): DirectionSuggestion[] | null {
  const close = reviews.filter(
    (review) => traitDistance(self, review.traits) <= SIMILAR_MAX_DISTANCE && review.roleType !== "other",
  );
  if (close.length < 3) return null;

  const groups = new Map<RoleType, { total: number; count: number }>();
  for (const review of close) {
    const group = groups.get(review.roleType) ?? { total: 0, count: 0 };
    group.total += review.enjoyment;
    group.count += 1;
    groups.set(review.roleType, group);
  }

  const ranked = [...groups.entries()].sort((left, right) => {
    const leftMean = left[1].total / left[1].count;
    const rightMean = right[1].total / right[1].count;
    if (rightMean !== leftMean) return rightMean - leftMean;
    if (right[1].count !== left[1].count) return right[1].count - left[1].count;
    return ROLE_TYPE_VALUES.indexOf(left[0]) - ROLE_TYPE_VALUES.indexOf(right[0]);
  });

  return ranked.slice(0, 3).map(([roleType]) => ({
    roleType,
    roleLabel: roleLabel(roleType),
    reason: SIMILAR_STUDENT_REASON,
    source: "similar_students" as const,
  }));
}

export function buildDirection(
  context: DirectionContext,
  reviews: readonly SimilarReview[],
): { label: string; basis: "rules" | "similar_students"; suggestions: DirectionSuggestion[] } {
  const fromStudents = suggestionsFromSimilar(context.traits, reviews);
  const fromRules = suggestionsFromRules(context);
  if (!fromStudents || fromStudents.length === 0) {
    return { label: DIRECTION_LABEL, basis: "rules", suggestions: fromRules };
  }

  const suggestions = [...fromStudents];
  for (const rule of fromRules) {
    if (suggestions.length === 3) break;
    if (suggestions.some((item) => item.roleType === rule.roleType)) continue;
    suggestions.push(rule);
  }

  return {
    label: DIRECTION_LABEL,
    basis: "similar_students",
    suggestions: suggestions.slice(0, 3),
  };
}
