import { and, count, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  advisorAccounts,
  advisorGrants,
  advisorRoster,
  assessments,
  careerAtlasMarks,
  employers,
  reviews,
  rotations,
  schoolDomains,
  users,
} from "@/db/schema";
import { chosenDirectionView } from "@/features/direction/chosen";
import { ApiError } from "@/lib/api";
import { emailHashSecret, emailHmac } from "@/lib/email-hash";
import { ROSTER_MAX } from "./emails";
import type { RosterInput } from "./schemas";
import type { ApprovedAdvisor } from "./server";

/**
 * Advisor roster and stats (item 15, PR 6.2, D9). Every caller has passed requireApprovedAdvisor.
 *
 * - The roster holds keyed hashes of emails, never the addresses. Changes answer only with the
 *   roster's size, which doesn't depend on who has an account.
 * - Roster stats count only roster students who granted this school's advisors access (PR 6.3).
 *   Adding an email can change them only if that person opted in, so a roster can't be used to
 *   find out whether an email has an account.
 * - Everyone else appears only in school-wide totals (students whose sign-in domain is one of the
 *   school's), which don't depend on the roster at all.
 * - Any count or list row from fewer than 2 students shows as "fewer than 2" (ground rule 5).
 */

export const MIN_STUDENTS = 2;

export function rosterSecretOrThrow(): string {
  const secret = emailHashSecret();
  if (!secret) throw new ApiError(503, "roster_unavailable", "The roster isn't turned on yet. The founders need to finish setting it up.");
  return secret;
}

export async function rosterSize(schoolId: string): Promise<number> {
  const [row] = await db.select({ value: count() }).from(advisorRoster).where(eq(advisorRoster.schoolId, schoolId));
  return Number(row?.value ?? 0);
}

export async function changeRoster(advisor: ApprovedAdvisor, input: RosterInput): Promise<{ rosterSize: number }> {
  const schoolId = advisor.school.id;
  if (input.action === "clear") {
    await db.delete(advisorRoster).where(eq(advisorRoster.schoolId, schoolId));
    return { rosterSize: 0 };
  }
  const secret = rosterSecretOrThrow();
  const hashes = [...new Set(input.emails.map((email) => emailHmac(email, secret)))];
  if (input.action === "remove") {
    await db.delete(advisorRoster).where(and(eq(advisorRoster.schoolId, schoolId), inArray(advisorRoster.emailHmac, hashes)));
    return { rosterSize: await rosterSize(schoolId) };
  }
  if ((await rosterSize(schoolId)) + hashes.length > ROSTER_MAX) {
    throw new ApiError(400, "roster_full", `A roster holds up to ${ROSTER_MAX} students. Remove some first.`);
  }
  await db
    .insert(advisorRoster)
    .values(hashes.map((emailHmac) => ({ schoolId, emailHmac, addedByUserId: advisor.userId })))
    .onConflictDoNothing();
  return { rosterSize: await rosterSize(schoolId) };
}

// ---- Stats ----------------------------------------------------------------------------------------

/** What Swervly knows about one student, for counting only. Never leaves this module per student. */
export type StudentFacts = {
  id: string;
  onboarded: boolean;
  quizDone: boolean;
  reviewed: boolean;
  directionNodeId: string | null;
  employerNames: string[];
};

/** A count, or null when fewer than 2 students are behind it. */
export type SafeCount = number | null;
export type Ranked = { label: string; students: number };

export type GroupStats = {
  students: SafeCount;
  onboarded: SafeCount;
  quizDone: SafeCount;
  reviewed: SafeCount;
  topDirections: Ranked[];
  topCompanies: Ranked[];
};

function safe(value: number): SafeCount {
  return value >= MIN_STUDENTS ? value : null;
}

function topRanked(labelsPerStudent: readonly (readonly string[])[], limit = 5): Ranked[] {
  const counts = new Map<string, number>();
  for (const labels of labelsPerStudent) for (const label of new Set(labels)) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, students]) => students >= MIN_STUDENTS)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([label, students]) => ({ label, students }));
}

/** Pure: counts and top lists for a group, with every number under 2 students withheld. */
export function groupStats(students: readonly StudentFacts[]): GroupStats {
  return {
    students: safe(students.length),
    onboarded: safe(students.filter((student) => student.onboarded).length),
    quizDone: safe(students.filter((student) => student.quizDone).length),
    reviewed: safe(students.filter((student) => student.reviewed).length),
    topDirections: topRanked(students.map((student) => {
      const title = chosenDirectionView(student.directionNodeId)?.title;
      return title ? [title] : [];
    })),
    topCompanies: topRanked(students.map((student) => student.employerNames)),
  };
}

type StudentFilter = { domains: readonly string[] } | { ids: readonly string[] };

/** Facts for students matched by sign-in domain (school-wide) or by id (opted-in roster students). Advisors excluded. */
export async function loadStudentFacts(filter: StudentFilter): Promise<StudentFacts[]> {
  const list = "domains" in filter ? filter.domains : filter.ids;
  if (list.length === 0) return [];
  const who = "domains" in filter ? inArray(users.school, [...filter.domains]) : inArray(users.id, [...filter.ids]);
  const notAdvisor = sql`not exists (select 1 from ${advisorAccounts} where ${advisorAccounts.userId} = ${users.id})`;
  const [people, marks, reviewed] = await db.batch([
    db
      .select({
        id: users.id,
        onboarded: isNotNull(users.onboardedAt),
        quizDone: sql<boolean>`exists (select 1 from ${assessments} where ${assessments.userId} = ${users.id})`,
      })
      .from(users)
      .where(and(who, notAdvisor)),
    db
      .select({ userId: careerAtlasMarks.userId, nodeId: careerAtlasMarks.nodeId })
      .from(careerAtlasMarks)
      .innerJoin(users, eq(users.id, careerAtlasMarks.userId))
      .where(and(who, notAdvisor, eq(careerAtlasMarks.mark, "pursuing"))),
    db
      .selectDistinct({ userId: rotations.userId, employerName: employers.name })
      .from(rotations)
      .innerJoin(reviews, eq(reviews.rotationId, rotations.id))
      .innerJoin(employers, eq(employers.id, rotations.employerId))
      .innerJoin(users, eq(users.id, rotations.userId))
      .where(and(who, notAdvisor)),
  ]);
  const direction = new Map(marks.map((row) => [row.userId, row.nodeId]));
  const companies = new Map<string, string[]>();
  for (const row of reviewed) companies.set(row.userId, [...(companies.get(row.userId) ?? []), row.employerName]);
  return people.map((person) => ({
    id: person.id,
    onboarded: Boolean(person.onboarded),
    quizDone: Boolean(person.quizDone),
    reviewed: companies.has(person.id),
    directionNodeId: direction.get(person.id) ?? null,
    employerNames: companies.get(person.id) ?? [],
  }));
}

/** Students with an active grant for this school whose email hash is on the roster. */
export async function optedInRosterIds(schoolId: string, secret: string): Promise<string[]> {
  const granted = await db
    .select({ id: users.id, email: users.email })
    .from(advisorGrants)
    .innerJoin(users, eq(users.id, advisorGrants.studentUserId))
    .where(and(eq(advisorGrants.schoolId, schoolId), isNull(advisorGrants.revokedAt)));
  if (granted.length === 0) return [];
  const byHash = new Map(granted.map((row) => [emailHmac(row.email, secret), row.id]));
  const onRoster = await db
    .select({ emailHmac: advisorRoster.emailHmac })
    .from(advisorRoster)
    .where(and(eq(advisorRoster.schoolId, schoolId), inArray(advisorRoster.emailHmac, [...byHash.keys()])));
  return onRoster.flatMap((row) => {
    const id = byHash.get(row.emailHmac);
    return id ? [id] : [];
  });
}

export type AdvisorDashboard = {
  rosterEnabled: boolean;
  rosterSize: number;
  roster: GroupStats;
  school: GroupStats;
};

export async function advisorDashboard(advisor: ApprovedAdvisor): Promise<AdvisorDashboard> {
  const secret = emailHashSecret();
  const domains = await db
    .select({ domain: schoolDomains.domain })
    .from(schoolDomains)
    .where(eq(schoolDomains.schoolId, advisor.school.id));
  const [size, schoolFacts, rosterIds] = await Promise.all([
    rosterSize(advisor.school.id),
    loadStudentFacts({ domains: domains.map((row) => row.domain) }),
    secret ? optedInRosterIds(advisor.school.id, secret) : Promise.resolve([]),
  ]);
  return {
    rosterEnabled: secret !== null,
    rosterSize: size,
    roster: groupStats(await loadStudentFacts({ ids: rosterIds })),
    school: groupStats(schoolFacts),
  };
}
