import { desc, eq } from "drizzle-orm";
import { INSTRUMENT, TRAITS, type Trait } from "@/content/mini-ipip";
import { db } from "@/db";
import { assessments, profiles, reviews, rotations, users, type User } from "@/db/schema";
import { interestedFirst, withoutDismissedRoles } from "@/features/direction/career-roles";
import {
  buildDirection,
  evidenceGroup,
  FALLBACK_EVIDENCE_LABEL,
  type DirectionSuggestion,
  type SimilarReview,
} from "@/features/direction/rules";
import { academicExploration, academicSource, type AcademicExploration } from "@/features/majors/selection";
import { hasShareReviewsConsent } from "@/features/privacy/share-consent";
import { readTraits, type TraitReading } from "@/features/profile/traits";
import type { TraitScores } from "@/features/profile/scoring";
import { isRoleType } from "@/features/review/roles";
import { isWouldReturn } from "@/features/review/would-return";
import { readPriorities, type Priority } from "@/features/direction/priorities";
import { whyMatched, type RoleReview } from "@/features/direction/why-matched";

export type DirectionPayload = {
  readings: TraitReading[];
  /** Raw quiz scores, 4 to 20 per trait. */
  traits: TraitScores;
  label: string;
  basis: "rules" | "similar_students" | "mixed";
  suggestions: DirectionSuggestion[];
  /** The student dismissed every role Swervly can suggest right now. */
  exhausted: boolean;
  /** Careers the student marked Interested, in the order they marked them. */
  interestedRoles: string[];
  academic: AcademicExploration;
  /** The student's top priorities (item 20), in the order chosen. */
  priorities: Priority[];
};

function parseScores(value: unknown): TraitScores | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const scores = {} as TraitScores;
  for (const trait of TRAITS) {
    const score = record[trait];
    if (typeof score !== "number" || !Number.isFinite(score)) return null;
    scores[trait as Trait] = score;
  }
  return scores;
}

export async function loadDirection(user: User): Promise<DirectionPayload | null> {
  const [profileRows, assessmentRows, reviewRows] = await Promise.all([
    db
      .select({ goal: profiles.goal, priorities: profiles.priorities })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1),
    db
      .select({
        userId: assessments.userId,
        instrument: assessments.instrument,
        scored: assessments.scored,
      })
      .from(assessments)
      .orderBy(desc(assessments.takenAt)),
    db
      .select({
        userId: rotations.userId,
        roleType: rotations.roleType,
        rotationNumber: rotations.rotationNumber,
        enjoyment: reviews.enjoyment,
        learning: reviews.learning,
        mentorship: reviews.mentorship,
        clarityGained: reviews.clarityGained,
        wouldReturn: rotations.wouldReturn,
        payHourly: rotations.payHourly,
        shareReviewsConsentAt: users.shareReviewsConsentAt,
        shareReviewsConsentVersion: users.shareReviewsConsentVersion,
        major: users.major,
        majorSource: users.majorSource,
      })
      .from(reviews)
      .innerJoin(rotations, eq(reviews.rotationId, rotations.id))
      .innerJoin(users, eq(users.id, rotations.userId)),
  ]);

  const self = assessmentRows.find((row) => row.userId === user.id);
  if (!self || self.instrument !== INSTRUMENT) return null;
  const traits = parseScores(self.scored);
  if (!traits) return null;

  const latest = new Map<string, TraitScores>();
  const seen = new Set<string>();
  for (const row of assessmentRows) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    if (row.instrument !== INSTRUMENT) continue;
    const parsed = parseScores(row.scored);
    if (parsed) latest.set(row.userId, parsed);
  }

  const majorForRules =
    user.majorSource === "undecided" || user.majorSource === "custom" ? "" : (user.major ?? "");
  // Evidence only from students in the same group of majors (founder decision, Nov 19, 2026).
  const group = evidenceGroup(majorForRules);
  const similar: SimilarReview[] = [];
  // Every shared review in the same group of majors, for priority reasons (not limited to similar quiz profiles).
  const pool: RoleReview[] = [];
  for (const row of reviewRows) {
    if (row.userId === user.id || !isRoleType(row.roleType)) continue;
    const reviewerMajor =
      row.majorSource === "undecided" || row.majorSource === "custom" ? "" : (row.major ?? "");
    if (group === null || evidenceGroup(reviewerMajor) !== group) continue;
    if (
      !hasShareReviewsConsent({
        shareReviewsConsentAt: row.shareReviewsConsentAt,
        shareReviewsConsentVersion: row.shareReviewsConsentVersion,
      })
    ) {
      continue;
    }
    pool.push({
      userId: row.userId,
      roleType: row.roleType,
      rotationNumber: row.rotationNumber,
      enjoyment: row.enjoyment,
      learning: row.learning,
      mentorship: row.mentorship,
      clarityGained: row.clarityGained,
      wouldReturn: isWouldReturn(row.wouldReturn) ? row.wouldReturn : "maybe",
      payHourly: row.payHourly == null ? null : Number(row.payHourly),
    });
    const profileTraits = latest.get(row.userId);
    if (!profileTraits) continue;
    similar.push({
      userId: row.userId,
      traits: profileTraits,
      roleType: row.roleType,
      enjoyment: row.enjoyment,
    });
  }

  const priorities = readPriorities(profileRows[0]?.priorities);
  const goalValue = profileRows[0]?.goal;
  const goal = goalValue === "grad_school" || goalValue === "undecided" ? goalValue : "industry";
  // Dismissed roles are skipped inside the ranking, so the next-best role takes their place.
  const direction = buildDirection({ traits, major: majorForRules, goal }, similar, user.dismissedCareerRoles);

  return {
    readings: readTraits(traits),
    traits,
    label: direction.label,
    basis: direction.basis,
    exhausted: direction.exhausted,
    // Interested careers rank first (founder decision: Interested shapes future suggestions).
    suggestions: interestedFirst(
      withoutDismissedRoles(direction.suggestions, user.dismissedCareerRoles),
      user.interestedCareerRoles,
    ).map((suggestion) => {
      // Fills / soft fallbacks are not quiz matches — skip "Why this matched".
      if (suggestion.roleType === "insufficient" || suggestion.evidenceLabel === FALLBACK_EVIDENCE_LABEL) {
        return suggestion;
      }
      return { ...suggestion, explanation: whyMatched(suggestion.parts, suggestion.roleType, priorities, pool) };
    }),
    priorities,
    interestedRoles: [...user.interestedCareerRoles],
    academic: academicExploration({
      source: academicSource(user),
      exploringMajors: user.exploringMajors,
      goal,
      traits,
    }),
  };
}
