import { PREFERENCE_QUESTIONS, type PreferenceQuestion, type QuestionAnswer } from "@/content/atlas/questions";
import { familiesForRole } from "@/features/atlas/compat";
import type { AtlasEntry } from "@/features/atlas/entry";
import { familiesBlockedByRoles, type AtlasGraph } from "@/features/atlas/graph";
import { ROLE_FAMILIES } from "@/features/atlas/compat";
import type { ActivityTag, AtlasNodeId, FamilyId, SpecializationId } from "@/features/atlas/types";

/**
 * Deterministic exploration priorities for specializations.
 *
 * Small integer points from named signals. Every point carries the sentence
 * that explains it, so "why is this shown" is the same data as the order.
 * The numbers are never shown. An exploration priority is not a prediction
 * of fit or success.
 *
 *   entry       +2 common major link, +1 sometimes (best family wins)
 *   activities  +1 per chosen activity the specialization involves, max +3
 *   direction   +1 if a family maps to a Direction role marked Interested
 *   interest    +3 if the student marked it, or a family above it, Interested here
 *   excluded    dismissed here, or every family above it is dismissed or role-blocked
 *
 * Missing information never subtracts. Ties break by stable id.
 */

export const POINTS = { common: 2, sometimes: 1, activityEach: 1, activityMax: 3, direction: 1, interest: 3 } as const;
export const TOP = 6;
export const MAX_PER_FAMILY = 2;

export type Answers = Readonly<Record<string, QuestionAnswer>>;

export type Signals = {
  answers: Answers;
  /** Atlas nodes marked on this screen. */
  interested: readonly AtlasNodeId[];
  dismissed: readonly AtlasNodeId[];
  /** Direction role ids, read only. */
  directionInterested: readonly string[];
  directionDismissed: readonly string[];
};

export type Ranked = {
  id: SpecializationId;
  title: string;
  family: FamilyId;
  points: number;
  reasons: string[];
  afield: boolean;
};

export function chosenTags(answers: Answers): { tag: ActivityTag; because: string }[] {
  const result: { tag: ActivityTag; because: string }[] = [];
  for (const question of PREFERENCE_QUESTIONS) {
    const answer = answers[question.id];
    const sides = answer === "a" ? [question.a] : answer === "b" ? [question.b] : answer === "both" ? [question.a, question.b] : [];
    for (const side of sides) {
      for (const tag of side.tags) {
        if (!result.some((item) => item.tag === tag)) result.push({ tag, because: side.label });
      }
    }
  }
  return result;
}

/** True when the student has told Atlas anything beyond their major. */
export function hasSignals(signals: Signals): boolean {
  return chosenTags(signals.answers).length > 0 || signals.interested.length > 0 || signals.directionInterested.length > 0;
}

export function rankSpecializations(graph: AtlasGraph, entry: AtlasEntry, signals: Signals): Ranked[] {
  const tags = chosenTags(signals.answers);
  const blocked = familiesBlockedByRoles(ROLE_FAMILIES, signals.directionDismissed);
  const entryStrength = new Map<FamilyId, "common" | "sometimes">();
  if (entry.kind === "major") for (const link of entry.families) entryStrength.set(link.family, link.strength);
  const directionFamilies = new Map<FamilyId, string>();
  for (const role of signals.directionInterested) {
    for (const familyId of familiesForRole(role)) if (!directionFamilies.has(familyId)) directionFamilies.set(familyId, role);
  }

  const scored: Ranked[] = [];
  for (const spec of graph.data.specializations) {
    if (signals.dismissed.includes(spec.id)) continue;
    const explicit = signals.interested.includes(spec.id);
    const openFamilies = spec.families.filter(
      (familyId) => signals.interested.includes(familyId) || (!signals.dismissed.includes(familyId) && !blocked.has(familyId)),
    );
    if (openFamilies.length === 0 && !explicit) continue;

    const reasons: string[] = [];
    let points = 0;

    // Entry: the strongest major link among its families.
    const common = openFamilies.find((familyId) => entryStrength.get(familyId) === "common");
    const sometimes = openFamilies.find((familyId) => entryStrength.get(familyId) === "sometimes");
    const label = entry.kind === "major" ? entry.label : "";
    if (common) {
      points += POINTS.common;
      reasons.push(`${label} students often explore ${graph.nodes.get(common)?.title ?? "this area"}.`);
    } else if (sometimes) {
      points += POINTS.sometimes;
      reasons.push(`Some ${label} students explore ${graph.nodes.get(sometimes)?.title ?? "this area"}.`);
    }

    // Activities the student said they would rather explore.
    const matches = tags.filter((item) => spec.activities.includes(item.tag));
    if (matches.length > 0) {
      points += Math.min(POINTS.activityMax, matches.length * POINTS.activityEach);
      for (const item of matches.slice(0, POINTS.activityMax)) reasons.push(`You said you'd rather explore: ${item.because.charAt(0).toLowerCase()}${item.because.slice(1)}.`);
    }

    // Direction roles marked Interested.
    const viaDirection = openFamilies.find((familyId) => directionFamilies.has(familyId));
    if (viaDirection) {
      points += POINTS.direction;
      reasons.push("It's in an area you marked Interested on Direction.");
    }

    // Interested marks in Atlas, on the specialization or a family above it.
    const markedFamily = spec.families.find((familyId) => signals.interested.includes(familyId));
    if (explicit || markedFamily) {
      points += POINTS.interest;
      reasons.push(explicit ? "You marked this Interested." : `You marked ${graph.nodes.get(markedFamily as FamilyId)?.title ?? "its area"} Interested.`);
    }

    const family = common ?? sometimes ?? openFamilies[0] ?? spec.families[0];
    scored.push({ id: spec.id, title: spec.title, family, points, reasons, afield: entry.kind === "major" && !common && !sometimes });
  }

  return scored.sort((left, right) => right.points - left.points || left.id.localeCompare(right.id));
}

/**
 * The top few, spread out: at most MAX_PER_FAMILY from one family, and for a
 * major entry the last slot goes to the best specialization outside the major's
 * usual families, so the list never only confirms the major.
 */
export function topPicks(ranked: readonly Ranked[], entry: AtlasEntry, size = TOP): Ranked[] {
  const picks: Ranked[] = [];
  const perFamily = new Map<FamilyId, number>();
  const room = entry.kind === "major" ? size - 1 : size;
  for (const item of ranked) {
    if (picks.length >= room) break;
    if (item.points === 0) continue;
    if ((perFamily.get(item.family) ?? 0) >= MAX_PER_FAMILY) continue;
    picks.push(item);
    perFamily.set(item.family, (perFamily.get(item.family) ?? 0) + 1);
  }
  if (entry.kind === "major") {
    const outside = ranked.find((item) => item.afield && !picks.includes(item));
    if (outside) {
      picks.push(
        outside.reasons.length > 0
          ? outside
          : { ...outside, reasons: [`Outside the usual ${entry.label} paths, in case you want to look further.`] },
      );
    }
  }
  return picks;
}

/**
 * What the next question is chosen against. Before the student says anything,
 * the top picks are only ties in id order, so use everything the entry reaches,
 * or the whole map when the entry reaches nothing in particular.
 */
export function questionPool(ranked: readonly Ranked[], picks: readonly Ranked[], signals: Signals): readonly Ranked[] {
  if (hasSignals(signals)) return picks;
  const reached = ranked.filter((item) => item.points > 0);
  // Nothing scores yet (undecided, custom, unmapped): choose against the whole map.
  return reached.length > 0 ? reached : ranked;
}

/**
 * The next question: the unanswered one whose smaller side covers the most of
 * the current options, so either answer reorders a lot. Then the more even
 * split, then the earlier question. Null when everything is answered or skipped.
 */
export function nextQuestion(
  graph: AtlasGraph,
  picks: readonly Ranked[],
  answers: Answers,
  skipped: readonly string[],
): PreferenceQuestion | null {
  const open = PREFERENCE_QUESTIONS.filter((question) => !(question.id in answers) && !skipped.includes(question.id));
  if (open.length === 0) return null;
  const tagsOf = (id: SpecializationId) => graph.data.specializations.find((spec) => spec.id === id)?.activities ?? [];
  const keyed = open.map((question, index) => {
    const a = picks.filter((item) => tagsOf(item.id).some((tag) => question.a.tags.includes(tag))).length;
    const b = picks.filter((item) => tagsOf(item.id).some((tag) => question.b.tags.includes(tag))).length;
    // Sort key: the largest smaller side (it divides the most options into two real groups),
    // then the more even split, then question order.
    return { question, key: [-Math.min(a, b), Math.abs(a - b), index] as const };
  });
  keyed.sort((left, right) => left.key[0] - right.key[0] || left.key[1] - right.key[1] || left.key[2] - right.key[2]);
  return keyed[0].question;
}
