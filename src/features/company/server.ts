import { and, eq } from "drizzle-orm";
import { SKILLS } from "@/content/skills";
import { db } from "@/db";
import { employers, reviews, rotations, skills, users, type User } from "@/db/schema";
import { aggregateForMajor, type PublicMajorView, type ReviewForAggregate } from "@/features/company/aggregate";
import { employerUsableByUser } from "@/features/review/server";
import type { CompanyPreviewInput } from "@/features/review/schemas";
import type { WouldReturn } from "@/features/review/would-return";
import { ApiError } from "@/lib/api";

type LoadedReview = ReviewForAggregate & { userId: string; rotationId: string };

function asWouldReturn(value: string): WouldReturn {
  if (value === "yes" || value === "maybe" || value === "no") return value;
  return "maybe";
}

export async function approvedSkillNames(): Promise<string[]> {
  const rows = await db
    .select({ name: skills.name })
    .from(skills)
    .where(eq(skills.status, "approved"));
  return [...SKILLS, ...rows.map((row) => row.name)];
}

async function loadEmployerReviews(employerId: string): Promise<LoadedReview[]> {
  const rows = await db
    .select({
      rotationId: rotations.id,
      userId: rotations.userId,
      major: users.major,
      wouldReturn: rotations.wouldReturn,
      enjoyment: reviews.enjoyment,
      learning: reviews.learning,
      mentorship: reviews.mentorship,
      clarityGained: reviews.clarityGained,
      skillsUsed: reviews.skillsUsed,
      payHourly: rotations.payHourly,
      freeText: reviews.freeText,
      shareFreeText: reviews.shareFreeText,
    })
    .from(rotations)
    .innerJoin(reviews, eq(reviews.rotationId, rotations.id))
    .innerJoin(users, eq(users.id, rotations.userId))
    .where(eq(rotations.employerId, employerId));

  return rows.map((row) => ({
    rotationId: row.rotationId,
    userId: row.userId,
    major: row.major ?? "",
    wouldReturn: asWouldReturn(row.wouldReturn),
    enjoyment: row.enjoyment,
    learning: row.learning,
    mentorship: row.mentorship,
    clarityGained: row.clarityGained,
    skillsUsed: row.skillsUsed,
    payHourly: row.payHourly == null ? null : Number(row.payHourly),
    freeText: row.freeText,
    shareFreeText: row.shareFreeText,
  }));
}

export async function companyViewForUser(
  user: User,
  employerId: string,
): Promise<{ employerName: string; view: PublicMajorView }> {
  const [employer] = await db.select().from(employers).where(eq(employers.id, employerId)).limit(1);
  if (!employer || !employerUsableByUser(employer, user.id)) {
    throw new ApiError(404, "employer_not_found", "Employer not found.");
  }
  const loaded = await loadEmployerReviews(employer.id);
  const view = aggregateForMajor(
    loaded,
    user.major ?? "",
    await approvedSkillNames(),
  );
  return { employerName: employer.name, view };
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

  const loaded = await loadEmployerReviews(employer.id);
  const kept = loaded.filter(
    (row) => !(input.rotationId && row.rotationId === input.rotationId && row.userId === user.id),
  );
  const note = input.freeText?.trim() ?? "";
  const draft: ReviewForAggregate = {
    major: user.major ?? "",
    wouldReturn: input.wouldReturn,
    enjoyment: input.enjoyment,
    learning: input.learning,
    mentorship: input.mentorship,
    clarityGained: input.clarityGained,
    skillsUsed: input.skillsUsed,
    payHourly: input.payHourly ?? null,
    freeText: note.length > 0 ? note : null,
    shareFreeText: note.length > 0 && input.shareFreeText,
  };

  const view = aggregateForMajor(
    [...kept, draft],
    user.major ?? "",
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
