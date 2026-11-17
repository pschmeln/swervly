import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { clerkClient } from "@clerk/nextjs/server";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assessments,
  employers,
  majorSubmissions,
  profiles,
  reviews,
  rotations,
  users,
  type Assessment,
  type Profile,
  type Review,
  type Rotation,
  type User,
} from "@/db/schema";
import { loadMajorSearchContext } from "@/features/majors/load";
import { resolveMajorWrite, type ProfileWriteInput } from "@/features/majors/selection";
import { ApiError } from "@/lib/api";
import { reportFailure } from "@/lib/sentry";
import { SHARE_REVIEWS_CONSENT_VERSION } from "@/features/privacy/share-consent";
import { type AssessmentInput } from "./schemas";
import { captureEvent } from "@/lib/analytics";
import { scoreMiniIpip, toProfileVector, VECTOR_VERSION } from "./scoring";

const CLERK_ERROR_CODE = /^[a-z0-9_]{1,64}$/;

function numberRecord(value: object): Record<string, number> {
  const record: Record<string, number> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "number") {
      throw new Error("number_record_invalid");
    }
    record[key] = entry;
  }
  return record;
}

function clerkErrorCode(error: unknown): string {
  if (!isClerkAPIResponseError(error)) return "unknown";
  const code = error.errors[0]?.code;
  if (typeof code === "string" && CLERK_ERROR_CODE.test(code)) return code;
  return "unknown";
}

function profileFields(input: ProfileWriteInput) {
  return {
    school: input.school,
    goal: input.goal,
    goalNotes: input.goalNotes ?? null,
    locationConstraint: input.locationConstraint,
    constraintsNotes: input.constraintsNotes ?? null,
    updatedAt: sql`now()`,
  };
}

export async function saveProfile(
  userId: string,
  input: ProfileWriteInput,
): Promise<{ user: User; profile: Profile }> {
  const context = await loadMajorSearchContext();
  const resolved = resolveMajorWrite(input, context);
  if (!resolved.ok) {
    throw new ApiError(400, "invalid_body", "Check the fields below and try again.", {
      majorSelection: resolved.message,
    });
  }

  const write = resolved.write;
  const fields = profileFields(input);
  const shareConsent =
    input.consentShareReviews === true
      ? {
          shareReviewsConsentAt: sql`coalesce(${users.shareReviewsConsentAt}, now())`,
          shareReviewsConsentVersion: sql`coalesce(${users.shareReviewsConsentVersion}, ${SHARE_REVIEWS_CONSENT_VERSION})`,
        }
      : {};

  let submissionId: string | null = null;
  let existingPendingId: string | null = null;
  if (write.submission) {
    const [existing] = await db
      .select({ id: majorSubmissions.id })
      .from(majorSubmissions)
      .where(and(eq(majorSubmissions.userId, userId), eq(majorSubmissions.status, "pending")))
      .limit(1);
    if (existing) {
      submissionId = existing.id;
      existingPendingId = existing.id;
    } else {
      submissionId = crypto.randomUUID();
    }
  }

  const userUpdate = db
    .update(users)
    .set({
      major: write.major,
      majorSource: write.source,
      customMajorText: write.customMajorText,
      majorSubmissionId: submissionId,
      exploringMajors: write.exploringMajors,
      year: input.year,
      coopTrack: input.coopTrack ?? null,
      consentPrivacyAt: sql`coalesce(${users.consentPrivacyAt}, now())`,
      consentDataUseAt: sql`coalesce(${users.consentDataUseAt}, now())`,
      ...shareConsent,
      updatedAt: sql`now()`,
    })
    .where(eq(users.id, userId))
    .returning();
  const profileWrite = db
    .insert(profiles)
    .values({ userId, ...fields })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: fields,
    })
    .returning();

  const results = write.submission
    ? existingPendingId
      ? await db.batch([
          db
            .update(majorSubmissions)
            .set({
              rawName: write.submission.rawName,
              normalizedName: write.submission.normalizedName,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(majorSubmissions.id, existingPendingId),
                eq(majorSubmissions.userId, userId),
                eq(majorSubmissions.status, "pending"),
              ),
            ),
          userUpdate,
          profileWrite,
        ])
      : await db.batch([
          db.insert(majorSubmissions).values({
            id: submissionId ?? crypto.randomUUID(),
            userId,
            rawName: write.submission.rawName,
            normalizedName: write.submission.normalizedName,
            status: "pending",
          }),
          userUpdate,
          profileWrite,
        ])
    : await db.batch([userUpdate, profileWrite]);

  const userRows = results[results.length - 2] as User[];
  const profileRows = results[results.length - 1] as Profile[];

  const user = userRows[0];
  const profile = profileRows[0];
  if (!user || !profile) {
    throw new Error("profile_write_missing");
  }

  return { user, profile };
}

export function onboardingResumeStep(
  hasProfile: boolean,
  consentPrivacyAt: Date | null,
  consentDataUseAt: Date | null,
  hasSchool = true,
): 1 | 3 {
  // Share-reviews consent is optional and must not force users back to step 1.
  if (
    hasProfile &&
    hasSchool &&
    consentPrivacyAt != null &&
    consentDataUseAt != null
  ) {
    return 3;
  }
  return 1;
}

export async function saveAssessment(
  userId: string,
  input: AssessmentInput,
): Promise<{ scored: ReturnType<typeof scoreMiniIpip>; onboarded: boolean }> {
  const [existing] = await db
    .select({
      userId: profiles.userId,
      consentPrivacyAt: users.consentPrivacyAt,
      consentDataUseAt: users.consentDataUseAt,
    })
    .from(profiles)
    .innerJoin(users, and(eq(users.id, profiles.userId), eq(users.id, userId)))
    .where(eq(profiles.userId, userId))
    .limit(1);

  if (!existing) {
    throw new ApiError(
      409,
      "profile_required",
      "Save your profile before the quiz.",
    );
  }

  if (existing.consentPrivacyAt == null || existing.consentDataUseAt == null) {
    throw new ApiError(
      409,
      "consent_required",
      "Accept both consents before the quiz.",
    );
  }

  const answers = numberRecord(input.answers);
  const scored = scoreMiniIpip(answers);

  await db.batch([
    db.insert(assessments).values({
      id: crypto.randomUUID(),
      userId,
      instrument: input.instrument,
      rawAnswers: answers,
      scored: numberRecord(scored),
    }),
    db
      .update(profiles)
      .set({
        profileVector: toProfileVector(answers),
        vectorVersion: VECTOR_VERSION,
        updatedAt: sql`now()`,
      })
      .where(eq(profiles.userId, userId)),
    db
      .update(users)
      .set({
        onboardedAt: sql`now()`,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(users.id, userId),
          isNull(users.onboardedAt),
          isNotNull(users.consentPrivacyAt),
          isNotNull(users.consentDataUseAt),
        ),
      ),
  ]);

  const [saved] = await db
    .select({ onboardedAt: users.onboardedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const onboardedAt = saved?.onboardedAt ?? null;

  if (onboardedAt != null) {
    await captureEvent("quiz_finished", userId);
  }

  return { scored, onboarded: onboardedAt != null };
}

export type AccountExportRotation = Rotation & {
  employerName: string;
  review: Review | null;
};

export type AccountExport = {
  user: User;
  profile: Profile | null;
  assessments: Assessment[];
  rotations: AccountExportRotation[];
};

export async function exportAccount(userId: string): Promise<AccountExport> {
  const [userRows, profileRows, assessmentRows, rotationRows] = await db.batch([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1),
    db
      .select()
      .from(assessments)
      .where(eq(assessments.userId, userId))
      .orderBy(asc(assessments.takenAt), asc(assessments.id)),
    db
      .select({
        rotation: rotations,
        review: reviews,
        employerName: employers.name,
      })
      .from(rotations)
      .innerJoin(employers, eq(rotations.employerId, employers.id))
      .leftJoin(reviews, eq(reviews.rotationId, rotations.id))
      .where(eq(rotations.userId, userId))
      .orderBy(asc(rotations.rotationNumber)),
  ]);

  const user = userRows[0];
  if (!user) {
    throw new Error("account_export_missing");
  }

  return {
    user,
    profile: profileRows[0] ?? null,
    assessments: assessmentRows,
    rotations: rotationRows.map((row) => ({
      ...row.rotation,
      employerName: row.employerName,
      review: row.review,
    })),
  };
}

export async function deleteAccount(user: User): Promise<void> {
  if (user.id.length === 0) {
    throw new Error("missing_user_id");
  }

  if (user.clerkId.length === 0) {
    const failure = new ApiError(
      500,
      "delete_failed",
      "We could not delete your account. Nothing was removed. Email support@swervly.com and we will do it for you.",
    );
    reportFailure("clerk_delete_failed", "missing_clerk_id", { error: failure, status: failure.status });
    throw failure;
  }

  // Clerk first. If this fails nothing is deleted, so the student can retry and
  // /privacy stays true. Deleting the rows first would leave a working login
  // behind a page that says the sign-in account is gone.
  try {
    const client = await clerkClient();
    await client.users.deleteUser(user.clerkId);
  } catch (error) {
    // Already absent in Clerk is the end state we want, so carry on to the rows.
    const alreadyGone = isClerkAPIResponseError(error) && error.status === 404;
    if (!alreadyGone) {
      const failure = new ApiError(
        502,
        "delete_failed",
        "We could not delete your sign-in account, so nothing was removed. Please try again, or email support@swervly.com.",
      );
      reportFailure("clerk_delete_failed", clerkErrorCode(error), {
        error: failure,
        status: failure.status,
      });
      throw failure;
    }
  }

  // The sign-in account is gone. This cascades to profile, assessments,
  // rotations and reviews for this user id. Driver errors can include the SQL
  // text, so a failure is logged as the user id only.
  try {
    await db.delete(users).where(eq(users.id, user.id));
  } catch {
    const failure = new ApiError(
      500,
      "delete_incomplete",
      "Your sign-in account was deleted, but some of your data may remain. Email support@swervly.com and we will remove the rest.",
    );
    reportFailure("account_rows_delete_failed", user.id, { error: failure, status: failure.status });
    throw failure;
  }
}
