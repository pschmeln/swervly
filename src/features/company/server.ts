import { and, eq, inArray } from "drizzle-orm";
import { SKILLS } from "@/content/skills";
import { db } from "@/db";
import { employers, reviews, rotations, skills, users, type User } from "@/db/schema";
import {
  aggregateForMajor,
  companyAverages,
  hiddenView,
  type CompanyAverages,
  type PublicMajorView,
  type ReviewForAggregate,
} from "@/features/company/aggregate";
import { publicAggregateMajor } from "@/features/majors/selection";
import { hasShareReviewsConsent } from "@/features/privacy/share-consent";
import { employerUsableByUser } from "@/features/review/server";
import type { CompanyPreviewInput } from "@/features/review/schemas";
import { isWouldReturn, type WouldReturn } from "@/features/review/would-return";
import { ApiError } from "@/lib/api";

type LoadedReview = ReviewForAggregate & { rotationId: string; employerId: string };

function hiddenMajorView(): PublicMajorView {
  return hiddenView();
}

function asWouldReturn(value: string): WouldReturn {
  if (isWouldReturn(value)) return value;
  return "maybe";
}

export async function approvedSkillNames(): Promise<string[]> {
  const rows = await db
    .select({ name: skills.name })
    .from(skills)
    .where(eq(skills.status, "approved"));
  return [...SKILLS, ...rows.map((row) => row.name)];
}

/**
 * Reviews other students may see: only from students with current share consent and a public
 * catalog major. No names, emails or ids leave the server; userId is used only for counting.
 */
async function loadSharedReviews(employerIds: readonly string[]): Promise<LoadedReview[]> {
  if (employerIds.length === 0) return [];
  const rows = await db
    .select({
      rotationId: rotations.id,
      employerId: rotations.employerId,
      rotationNumber: rotations.rotationNumber,
      userId: rotations.userId,
      major: users.major,
      majorSource: users.majorSource,
      wouldReturn: rotations.wouldReturn,
      enjoyment: reviews.enjoyment,
      learning: reviews.learning,
      mentorship: reviews.mentorship,
      clarityGained: reviews.clarityGained,
      skillsUsed: reviews.skillsUsed,
      payHourly: rotations.payHourly,
      freeText: reviews.freeText,
      shareFreeText: reviews.shareFreeText,
      shareReviewsConsentAt: users.shareReviewsConsentAt,
      shareReviewsConsentVersion: users.shareReviewsConsentVersion,
    })
    .from(rotations)
    .innerJoin(reviews, eq(reviews.rotationId, rotations.id))
    .innerJoin(users, eq(users.id, rotations.userId))
    .where(inArray(rotations.employerId, [...employerIds]));

  return rows
    .filter((row) =>
      hasShareReviewsConsent({
        shareReviewsConsentAt: row.shareReviewsConsentAt,
        shareReviewsConsentVersion: row.shareReviewsConsentVersion,
      }),
    )
    .flatMap((row) => {
      const major = publicAggregateMajor({ major: row.major, majorSource: row.majorSource });
      if (!major) return [];
      return [{
      rotationId: row.rotationId,
      employerId: row.employerId,
      rotationNumber: row.rotationNumber,
      userId: row.userId,
      major,
      wouldReturn: asWouldReturn(row.wouldReturn),
      enjoyment: row.enjoyment,
      learning: row.learning,
      mentorship: row.mentorship,
      clarityGained: row.clarityGained,
      skillsUsed: row.skillsUsed,
      payHourly: row.payHourly == null ? null : Number(row.payHourly),
      freeText: row.freeText,
      shareFreeText: row.shareFreeText,
    }];
    });
}

async function loadEmployerReviews(employerId: string): Promise<LoadedReview[]> {
  return loadSharedReviews([employerId]);
}

/** The company page: the viewer's own major, or the all-majors fallback when that is hidden (item 4). */
export async function companyViewForUser(
  user: User,
  employerId: string,
): Promise<{ employerName: string; viewerMajor: string | null } & CompanyAverages> {
  const [employer] = await db.select().from(employers).where(eq(employers.id, employerId)).limit(1);
  if (!employer || !employerUsableByUser(employer, user.id)) {
    throw new ApiError(404, "employer_not_found", "Employer not found.");
  }
  const viewerMajor = publicAggregateMajor(user);
  const loaded = await loadEmployerReviews(employer.id);
  return { employerName: employer.name, viewerMajor, ...companyAverages(loaded, viewerMajor, await approvedSkillNames()) };
}

export type DirectoryAverages = { employerId: string } & CompanyAverages;

/**
 * Averages for directory companies, keyed by normalized employer name (companies.ts and the
 * employers table share it). Approved employers only. One query for every company.
 */
export async function directoryAverages(
  user: User,
  normalizedNames: readonly string[],
): Promise<Map<string, DirectoryAverages>> {
  const result = new Map<string, DirectoryAverages>();
  if (normalizedNames.length === 0) return result;
  const rows = await db
    .select({ id: employers.id, normalizedName: employers.normalizedName })
    .from(employers)
    .where(and(inArray(employers.normalizedName, [...normalizedNames]), eq(employers.status, "approved")));
  if (rows.length === 0) return result;
  const viewerMajor = publicAggregateMajor(user);
  const [reviewsLoaded, approvedSkills] = await Promise.all([loadSharedReviews(rows.map((row) => row.id)), approvedSkillNames()]);
  for (const row of rows) {
    const forEmployer = reviewsLoaded.filter((review) => review.employerId === row.id);
    result.set(row.normalizedName, { employerId: row.id, ...companyAverages(forEmployer, viewerMajor, approvedSkills) });
  }
  return result;
}

export async function previewCompany(
  user: User,
  input: CompanyPreviewInput,
): Promise<{ employerName: string; view: PublicMajorView }> {
  const [employer] = await db
    .select()
    .from(employers)
    .where(eq(employers.id, input.employerId))
    .limit(1);
  if (!employer || !employerUsableByUser(employer, user.id)) {
    throw new ApiError(404, "employer_not_found", "Employer not found.");
  }

  const viewerMajor = publicAggregateMajor(user);
  if (!viewerMajor) {
    return { employerName: employer.name, view: hiddenMajorView() };
  }

  const loaded = await loadEmployerReviews(employer.id);
  const kept = loaded.filter(
    (row) => !(input.rotationId && row.rotationId === input.rotationId && row.userId === user.id),
  );

  // Preview includes the current user's draft only when they have share consent,
  // matching what would appear after save for public aggregation.
  const authorized = hasShareReviewsConsent(user);
  const note = input.freeText?.trim() ?? "";
  const draft: ReviewForAggregate | null = authorized
    ? {
        userId: user.id,
        major: viewerMajor,
        wouldReturn: input.wouldReturn,
        // The draft counts as the student's latest co-op here.
        rotationNumber: Number.MAX_SAFE_INTEGER,
        enjoyment: input.enjoyment,
        learning: input.learning,
        mentorship: input.mentorship,
        clarityGained: input.clarityGained,
        skillsUsed: input.skillsUsed,
        payHourly: input.payHourly ?? null,
        freeText: note.length > 0 ? note : null,
        shareFreeText: note.length > 0 && input.shareFreeText,
      }
    : null;

  const view = aggregateForMajor(
    draft ? [...kept, draft] : kept,
    viewerMajor,
    await approvedSkillNames(),
  );
  return { employerName: employer.name, view };
}

export async function employerIsVisible(userId: string, employerId: string): Promise<boolean> {
  const [employer] = await db
    .select()
    .from(employers)
    .where(and(eq(employers.id, employerId)))
    .limit(1);
  return Boolean(employer && employerUsableByUser(employer, userId));
}
