import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { clerkClient } from "@clerk/nextjs/server";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assessments,
  employers,
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
import { ApiError } from "@/lib/api";
import { type AssessmentInput, type ProfileInput } from "./schemas";
import { scoreRiasec, toProfileVector, VECTOR_VERSION } from "./scoring";

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

function profileFields(input: ProfileInput) {
  return {
    goal: input.goal,
    goalNotes: input.goalNotes ?? null,
    locationConstraint: input.locationConstraint,
    constraintsNotes: input.constraintsNotes ?? null,
    updatedAt: sql`now()`,
  };
}

export async function saveProfile(
  userId: string,
  input: ProfileInput,
): Promise<{ user: User; profile: Profile }> {
  const fields = profileFields(input);
  const [userRows, profileRows] = await db.batch([
    db
      .update(users)
      .set({
        major: input.major,
        year: input.year,
        coopTrack: input.coopTrack ?? null,
        consentPrivacyAt: sql`coalesce(${users.consentPrivacyAt}, now())`,
        consentDataUseAt: sql`coalesce(${users.consentDataUseAt}, now())`,
        updatedAt: sql`now()`,
      })
      .where(eq(users.id, userId))
      .returning(),
    db
      .insert(profiles)
      .values({ userId, ...fields })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: fields,
      })
      .returning(),
  ]);

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
): 1 | 3 {
  if (hasProfile && consentPrivacyAt != null && consentDataUseAt != null) {
    return 3;
  }
  return 1;
}

export async function saveAssessment(
  userId: string,
  input: AssessmentInput,
): Promise<{ scored: ReturnType<typeof scoreRiasec>; onboarded: boolean }> {
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
      "Save your profile before the interest questions.",
    );
  }

  if (existing.consentPrivacyAt == null || existing.consentDataUseAt == null) {
    throw new ApiError(
      409,
      "consent_required",
      "Accept both consents before the interest questions.",
    );
  }

  const answers = numberRecord(input.answers);
  const scored = scoreRiasec(answers);

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

  // user.id comes from apiUser(). This cascades to that user's profile, assessments, rotations, and reviews.
  await db.delete(users).where(eq(users.id, user.id));

  if (user.clerkId.length === 0) {
    console.error("clerk_delete_failed", "missing_clerk_id");
    return;
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(user.clerkId);
  } catch (error) {
    // The database row is already gone. Report success and keep the log to the error code.
    console.error("clerk_delete_failed", clerkErrorCode(error));
  }
}
