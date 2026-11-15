import { and, asc, eq, like, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { employers, reviews, rotations, type Employer } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { DATA_SOURCE } from "@/lib/constants";
import { normalizeEmployerName } from "@/features/review/normalize";
import type {
  EmployerCreateInput,
  RotationInput,
} from "@/features/review/schemas";

export type EmployerSuggestion = {
  id: string;
  name: string;
  city: string | null;
};

export type RotationWithDetails = {
  id: string;
  userId: string;
  employerId: string;
  roleTitle: string;
  termSeason: string;
  termYear: number;
  rotationNumber: number;
  payHourly: string | null;
  returnOffer: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
  employer: { id: string; name: string };
  review: {
    id: string;
    rotationId: string;
    enjoyment: number;
    learning: number;
    mentorship: number;
    clarityGained: number;
    skillsUsed: string[];
    freeText: string | null;
    shareFreeText: boolean;
    source: string;
    createdAt: Date;
    updatedAt: Date;
  };
};

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

type UniqueViolationCarrier = {
  code?: unknown;
  constraint?: unknown;
  cause?: unknown;
};

/**
 * Postgres unique_violation (23505) on one constraint.
 * neon-http single queries throw DrizzleQueryError with the Neon error on
 * `.cause`. db.batch throws that Neon error directly, so both shapes count.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const candidate = current as UniqueViolationCarrier;
    if (candidate.code === "23505" && candidate.constraint === constraint) {
      return true;
    }
    current = candidate.cause;
  }
  return false;
}

function employerVisibleToUser(userId: string) {
  return or(
    eq(employers.status, "approved"),
    and(eq(employers.status, "pending"), eq(employers.createdByUserId, userId)),
  );
}

/** Approved, or pending created by this user — never another user's pending. */
export function employerUsableByUser(employer: Employer, userId: string): boolean {
  if (employer.status === "approved") return true;
  return employer.status === "pending" && employer.createdByUserId === userId;
}

/**
 * Unique index employers_normalized_name_uq is global. Without a schema change we cannot
 * insert a second pending row for the same normalized name, so the second user gets a
 * non-leaking conflict instead of another user's pending id.
 */
function throwEmployerNameUnavailable(): never {
  throw new ApiError(
    409,
    "employer_name_unavailable",
    "That employer name is not available.",
    { name: "That employer name is not available." },
  );
}

/** Returns a usable employer or throws a non-leaking 409. */
export function resolveExistingEmployerForUser(
  employer: Employer,
  userId: string,
): Employer {
  if (employerUsableByUser(employer, userId)) return employer;
  throwEmployerNameUnavailable();
}

function payHourlyToDb(value: number | undefined): string | null {
  if (value === undefined) return null;
  return value.toFixed(2);
}

async function findEmployerByNormalizedName(
  normalizedName: string,
): Promise<Employer | null> {
  const [row] = await db
    .select()
    .from(employers)
    .where(eq(employers.normalizedName, normalizedName))
    .limit(1);
  return row ?? null;
}

async function findEmployerByAliasNormalized(
  normalizedName: string,
): Promise<Employer | null> {
  const rows = await db.select().from(employers);
  for (const row of rows) {
    if (row.aliases.some((alias) => normalizeEmployerName(alias) === normalizedName)) {
      return row;
    }
  }
  return null;
}

export async function searchEmployers(
  userId: string,
  q: string,
): Promise<EmployerSuggestion[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  const normalizedQ = normalizeEmployerName(trimmed);
  if (!normalizedQ) return [];

  const namePattern = `%${escapeLikePattern(normalizedQ)}%`;
  const aliasPattern = `%${escapeLikePattern(trimmed)}%`;

  const rows = await db
    .select({
      id: employers.id,
      name: employers.name,
      city: employers.city,
    })
    .from(employers)
    .where(
      and(
        employerVisibleToUser(userId),
        or(
          like(employers.normalizedName, namePattern),
          sql`exists (
            select 1
            from unnest(${employers.aliases}) as alias(value)
            where alias.value ilike ${aliasPattern} escape '\\'
          )`,
        ),
      ),
    )
    .limit(8);

  return rows;
}

export async function createOrFindEmployer(
  userId: string,
  input: EmployerCreateInput,
): Promise<{ employer: Employer; created: boolean }> {
  const normalizedName = normalizeEmployerName(input.name);
  if (!normalizedName) {
    throw new ApiError(400, "invalid_body", "Employer name is invalid.", {
      name: "Employer name is invalid.",
    });
  }

  const existing =
    (await findEmployerByNormalizedName(normalizedName)) ??
    (await findEmployerByAliasNormalized(normalizedName));

  if (existing) {
    return {
      employer: resolveExistingEmployerForUser(existing, userId),
      created: false,
    };
  }

  const id = crypto.randomUUID();
  try {
    const [created] = await db
      .insert(employers)
      .values({
        id,
        name: input.name.trim(),
        normalizedName,
        aliases: [],
        industry: input.industry ?? null,
        city: input.city ?? null,
        status: "pending",
        createdByUserId: userId,
      })
      .returning();

    if (!created) {
      throw new ApiError(500, "internal_error", "Something went wrong.");
    }
    return { employer: created, created: true };
  } catch (error) {
    if (!isUniqueViolation(error, "employers_normalized_name_uq")) {
      throw error;
    }
    // Concurrent insert won the unique index. Re-select and only return if usable.
    const raced = await findEmployerByNormalizedName(normalizedName);
    if (!raced) {
      throw new ApiError(500, "internal_error", "Something went wrong.");
    }
    return {
      employer: resolveExistingEmployerForUser(raced, userId),
      created: false,
    };
  }
}

async function requireVisibleEmployer(userId: string, employerId: string) {
  const [row] = await db
    .select()
    .from(employers)
    .where(and(eq(employers.id, employerId), employerVisibleToUser(userId)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "employer_not_found", "Employer not found.");
  }
  return row;
}

async function requireOwnedRotation(userId: string, rotationId: string) {
  const [row] = await db
    .select()
    .from(rotations)
    .where(and(eq(rotations.id, rotationId), eq(rotations.userId, userId)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "rotation_not_found", "Rotation not found.");
  }
  return row;
}

function mapRotationRow(row: {
  rotation: typeof rotations.$inferSelect;
  employerId: string;
  employerName: string;
  review: typeof reviews.$inferSelect;
}): RotationWithDetails {
  return {
    ...row.rotation,
    employer: { id: row.employerId, name: row.employerName },
    review: row.review,
  };
}

export async function listRotations(userId: string): Promise<RotationWithDetails[]> {
  const rows = await db
    .select({
      rotation: rotations,
      employerId: employers.id,
      employerName: employers.name,
      review: reviews,
    })
    .from(rotations)
    .innerJoin(employers, eq(rotations.employerId, employers.id))
    .innerJoin(reviews, eq(reviews.rotationId, rotations.id))
    .where(eq(rotations.userId, userId))
    .orderBy(asc(rotations.rotationNumber));

  return rows.map(mapRotationRow);
}

async function loadRotationWithDetails(
  userId: string,
  rotationId: string,
): Promise<RotationWithDetails> {
  const [row] = await db
    .select({
      rotation: rotations,
      employerId: employers.id,
      employerName: employers.name,
      review: reviews,
    })
    .from(rotations)
    .innerJoin(employers, eq(rotations.employerId, employers.id))
    .innerJoin(reviews, eq(reviews.rotationId, rotations.id))
    .where(and(eq(rotations.id, rotationId), eq(rotations.userId, userId)))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "rotation_not_found", "Rotation not found.");
  }
  return mapRotationRow(row);
}

export async function createRotation(
  userId: string,
  input: RotationInput,
): Promise<RotationWithDetails> {
  await requireVisibleEmployer(userId, input.employerId);

  const rotationId = crypto.randomUUID();
  const reviewId = crypto.randomUUID();
  const now = new Date();

  try {
    await db.batch([
      db.insert(rotations).values({
        id: rotationId,
        userId,
        employerId: input.employerId,
        roleTitle: input.roleTitle,
        termSeason: input.termSeason,
        termYear: input.termYear,
        rotationNumber: input.rotationNumber,
        payHourly: payHourlyToDb(input.payHourly),
        returnOffer: input.returnOffer,
        source: DATA_SOURCE,
        createdAt: now,
        updatedAt: now,
      }),
      db.insert(reviews).values({
        id: reviewId,
        rotationId,
        enjoyment: input.review.enjoyment,
        learning: input.review.learning,
        mentorship: input.review.mentorship,
        clarityGained: input.review.clarityGained,
        skillsUsed: input.review.skillsUsed,
        freeText: input.review.freeText ?? null,
        shareFreeText: input.review.shareFreeText,
        source: DATA_SOURCE,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
  } catch (error) {
    if (isUniqueViolation(error, "rotations_user_number_uq")) {
      throw new ApiError(
        409,
        "rotation_number_taken",
        "That rotation number is already used.",
        { rotationNumber: "That rotation number is already used." },
      );
    }
    throw error;
  }

  return loadRotationWithDetails(userId, rotationId);
}

export async function updateRotation(
  userId: string,
  rotationId: string,
  input: RotationInput,
): Promise<RotationWithDetails> {
  await requireOwnedRotation(userId, rotationId);
  await requireVisibleEmployer(userId, input.employerId);

  const now = new Date();

  try {
    await db.batch([
      db
        .update(rotations)
        .set({
          employerId: input.employerId,
          roleTitle: input.roleTitle,
          termSeason: input.termSeason,
          termYear: input.termYear,
          rotationNumber: input.rotationNumber,
          payHourly: payHourlyToDb(input.payHourly),
          returnOffer: input.returnOffer,
          updatedAt: now,
        })
        .where(and(eq(rotations.id, rotationId), eq(rotations.userId, userId))),
      db
        .update(reviews)
        .set({
          enjoyment: input.review.enjoyment,
          learning: input.review.learning,
          mentorship: input.review.mentorship,
          clarityGained: input.review.clarityGained,
          skillsUsed: input.review.skillsUsed,
          freeText: input.review.freeText ?? null,
          shareFreeText: input.review.shareFreeText,
          updatedAt: now,
        })
        .where(eq(reviews.rotationId, rotationId)),
    ]);
  } catch (error) {
    if (isUniqueViolation(error, "rotations_user_number_uq")) {
      throw new ApiError(
        409,
        "rotation_number_taken",
        "That rotation number is already used.",
        { rotationNumber: "That rotation number is already used." },
      );
    }
    throw error;
  }

  return loadRotationWithDetails(userId, rotationId);
}

export async function deleteRotation(
  userId: string,
  rotationId: string,
): Promise<{ id: string }> {
  await requireOwnedRotation(userId, rotationId);

  await db
    .delete(rotations)
    .where(and(eq(rotations.id, rotationId), eq(rotations.userId, userId)));

  return { id: rotationId };
}
