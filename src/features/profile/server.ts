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

/**
 * SET fragment for turning on review sharing from onboarding or the profile.
 * Keeps the original time only for consent to the current terms; consent to
 * older terms (a lower version) is replaced with now() and the current version.
 */
export function shareReviewsConsentSql(consenting: boolean) {
  if (!consenting) return sql``;
  return sql`, share_reviews_consent_at = case when share_reviews_consent_version = ${SHARE_REVIEWS_CONSENT_VERSION} then coalesce(share_reviews_consent_at, now()) else now() end, share_reviews_consent_version = ${SHARE_REVIEWS_CONSENT_VERSION}`;
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
  const conflict = () =>
    new ApiError(409, "conflict", "Your major changed while this was saving. Reload and try again.");
  const shareSql = shareReviewsConsentSql(input.consentShareReviews === true);
  const userSet = sql`
    major = ${write.major},
    major_source = ${write.source},
    custom_major_text = ${write.customMajorText},
    exploring_majors = ${write.exploringMajors},
    year = ${input.year},
    coop_track = ${input.coopTrack ?? null},
    consent_privacy_at = coalesce(consent_privacy_at, now()),
    consent_data_use_at = coalesce(consent_data_use_at, now()),
    updated_at = now()
    ${shareSql}
  `;
  // The profile write is the statement's main query, so it runs only when `changed` has a row.
  const profileWrite = sql`
    insert into profiles (
      user_id, school, goal, goal_notes, location_constraint, constraints_notes, updated_at
    )
    select
      ${userId}::uuid,
      ${fields.school},
      ${fields.goal},
      ${fields.goalNotes},
      ${fields.locationConstraint},
      ${fields.constraintsNotes},
      now()
    from changed
    on conflict (user_id) do update set
      school = excluded.school,
      goal = excluded.goal,
      goal_notes = excluded.goal_notes,
      location_constraint = excluded.location_constraint,
      constraints_notes = excluded.constraints_notes,
      updated_at = now()
    returning user_id as id
  `;

  if (write.submission) {
    const [existing] = await db
      .select({ id: majorSubmissions.id })
      .from(majorSubmissions)
      .where(and(eq(majorSubmissions.userId, userId), eq(majorSubmissions.status, "pending")))
      .limit(1);
    const saved = existing
      ? await db.execute<{ id: string }>(sql`
          with renamed as (
            update major_submissions
            set raw_name = ${write.submission.rawName},
                normalized_name = ${write.submission.normalizedName},
                updated_at = now()
            where id = ${existing.id}::uuid
              and user_id = ${userId}::uuid
              and status = 'pending'
            returning id
          ),
          changed as (
            update users
            set ${userSet},
                major_submission_id = ${existing.id}::uuid
            where users.id = ${userId}::uuid
              and exists (select 1 from renamed)
            returning users.id
          )
          ${profileWrite}
        `)
      : await db.execute<{ id: string }>(sql`
          with inserted as (
            insert into major_submissions (id, user_id, raw_name, normalized_name, status)
            values (
              ${crypto.randomUUID()}::uuid,
              ${userId}::uuid,
              ${write.submission.rawName},
              ${write.submission.normalizedName},
              'pending'
            )
            on conflict (user_id) where status = 'pending' do nothing
            returning id
          ),
          changed as (
            update users
            set ${userSet},
                major_submission_id = (select id from inserted)
            where users.id = ${userId}::uuid
              and exists (select 1 from inserted)
            returning users.id
          )
          ${profileWrite}
        `);
    if (returnedIds(saved).length === 0) throw conflict();
  } else {
    const saved = await db.execute<{ id: string }>(sql`
      with changed as (
        update users
        set ${userSet},
            major_submission_id = null
        where users.id = ${userId}::uuid
        returning users.id
      )
      ${profileWrite}
    `);
    if (returnedIds(saved).length === 0) throw new Error("profile_write_missing");
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!user || !profile) {
    throw new Error("profile_write_missing");
  }

  return { user, profile };
}

function returnedIds(result: unknown): unknown[] {
  const rows = result && typeof result === "object" && "rows" in result ? result.rows : result;
  return Array.isArray(rows) ? rows : [];
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
    // The end-of-quiz choice. Undecided students always see majors, so it is not stored for them.
    ...(input.exploringMajors === undefined
      ? []
      : [
          db
            .update(users)
            .set({ exploringMajors: input.exploringMajors, updatedAt: sql`now()` })
            .where(and(eq(users.id, userId), sql`${users.majorSource} is distinct from 'undecided'`)),
        ]),
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
