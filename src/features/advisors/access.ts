import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { INSTRUMENT } from "@/content/mini-ipip";
import { db } from "@/db";
import {
  advisorAccounts,
  advisorGrants,
  advisorRoster,
  advisorViewLog,
  assessments,
  careerAtlasMarks,
  employers,
  profiles,
  reviews,
  rotations,
  schoolDomains,
  schools,
  users,
  type User,
} from "@/db/schema";
import { chosenDirectionView } from "@/features/direction/chosen";
import { displayMajor } from "@/features/majors/selection";
import { archetypeFor, type ArchetypeCard } from "@/features/profile/archetype";
import { GOAL_OPTIONS } from "@/features/profile/components/options";
import { scoresFromStored } from "@/features/profile/scoring";
import { careerRoleLabel } from "@/features/direction/career-roles";
import { ApiError } from "@/lib/api";
import { emailHashSecret, emailHmac } from "@/lib/email-hash";
import { ADVISOR_CONSENT_VERSION, ADVISOR_FIELD_IDS, type AdvisorFieldId } from "./consent";
import type { ApprovedAdvisor, SchoolRef } from "./server";

/**
 * Advisor access to one student (item 15, PR 6.3, D9).
 *
 * An advisor sees a student only when ALL hold, checked on every request:
 * - the advisor passed requireApprovedAdvisor (approved, sign-in domain still the school's);
 * - the student has an active grant for THAT school: not revoked, under the current consent version;
 * - the student's email hash is on that school's roster.
 * Anything else is "not found", the same answer as an id that doesn't exist, so an advisor never
 * learns whether an email or id belongs to a student who didn't opt in.
 *
 * Every detail view writes a row to advisor_view_log, which the student reads in Settings.
 */

const NOT_FOUND = () => new ApiError(404, "not_found", "Not found.");

/** SQL for "this grant counts right now". Used by every access path, including roster stats. */
export function activeGrant(schoolId: string) {
  return and(
    eq(advisorGrants.schoolId, schoolId),
    isNull(advisorGrants.revokedAt),
    eq(advisorGrants.consentVersion, ADVISOR_CONSENT_VERSION),
  );
}

// ---- Student side ---------------------------------------------------------------------------------

export type ViewLogEntry = { advisorName: string; schoolName: string; viewedAt: Date; fields: string[] };

export type StudentAdvisorState = {
  /** The school the student's sign-in email belongs to, or null (then there is nothing to share with). */
  school: SchoolRef | null;
  status: "sharing" | "stopped" | "outdated" | "never";
  advisorNames: string[];
  onRoster: boolean;
  log: ViewLogEntry[];
};

async function schoolForUser(user: User): Promise<SchoolRef | null> {
  if (!user.school) return null;
  const [row] = await db
    .select({ id: schools.id, name: schools.name })
    .from(schoolDomains)
    .innerJoin(schools, eq(schools.id, schoolDomains.schoolId))
    .where(eq(schoolDomains.domain, user.school.toLowerCase()))
    .limit(1);
  return row ?? null;
}

export function grantStatus(grant: { revokedAt: Date | null; consentVersion: number } | undefined): StudentAdvisorState["status"] {
  if (!grant) return "never";
  if (grant.revokedAt) return "stopped";
  return grant.consentVersion === ADVISOR_CONSENT_VERSION ? "sharing" : "outdated";
}

/** What Settings shows the student: their school, whether they share, who can look, and every view. */
export async function studentAdvisorState(user: User): Promise<StudentAdvisorState> {
  const [school, log] = await Promise.all([schoolForUser(user), studentViewLog(user.id)]);
  if (!school) return { school: null, status: "never", advisorNames: [], onRoster: false, log };
  const secret = emailHashSecret();
  const [grants, advisors, roster] = await Promise.all([
    db
      .select({ revokedAt: advisorGrants.revokedAt, consentVersion: advisorGrants.consentVersion })
      .from(advisorGrants)
      .where(and(eq(advisorGrants.studentUserId, user.id), eq(advisorGrants.schoolId, school.id)))
      .limit(1),
    db
      .select({ name: advisorAccounts.displayName })
      .from(advisorAccounts)
      .where(and(eq(advisorAccounts.schoolId, school.id), eq(advisorAccounts.status, "approved")))
      .orderBy(asc(advisorAccounts.displayName)),
    secret
      ? db
          .select({ one: sql<number>`1` })
          .from(advisorRoster)
          .where(and(eq(advisorRoster.schoolId, school.id), eq(advisorRoster.emailHmac, emailHmac(user.email, secret))))
          .limit(1)
      : Promise.resolve([]),
  ]);
  return { school, status: grantStatus(grants[0]), advisorNames: advisors.map((row) => row.name), onRoster: roster.length > 0, log };
}

/**
 * Home's prompt (D9): true only when an advisor at the student's school listed them and the student
 * has never answered. A student who stopped sharing isn't asked again.
 */
export async function shouldPromptRoster(user: User): Promise<boolean> {
  const secret = emailHashSecret();
  if (!secret) return false;
  const school = await schoolForUser(user);
  if (!school) return false;
  const [grants, roster] = await Promise.all([
    db
      .select({ one: sql<number>`1` })
      .from(advisorGrants)
      .where(and(eq(advisorGrants.studentUserId, user.id), eq(advisorGrants.schoolId, school.id)))
      .limit(1),
    db
      .select({ one: sql<number>`1` })
      .from(advisorRoster)
      .where(and(eq(advisorRoster.schoolId, school.id), eq(advisorRoster.emailHmac, emailHmac(user.email, secret))))
      .limit(1),
  ]);
  return grants.length === 0 && roster.length > 0;
}

export async function studentViewLog(userId: string): Promise<ViewLogEntry[]> {
  return db
    .select({ advisorName: advisorViewLog.advisorName, schoolName: schools.name, viewedAt: advisorViewLog.viewedAt, fields: advisorViewLog.fields })
    .from(advisorViewLog)
    .innerJoin(schools, eq(schools.id, advisorViewLog.schoolId))
    .where(eq(advisorViewLog.studentUserId, userId))
    .orderBy(desc(advisorViewLog.viewedAt))
    .limit(200);
}

/**
 * Turn sharing on or off for the student's own school. The school must be the one their sign-in
 * email belongs to; the body can't name another. Off takes effect on the advisor's next request.
 */
export async function setAdvisorGrant(user: User, input: { schoolId: string; share: boolean; version?: number }): Promise<{ status: StudentAdvisorState["status"] }> {
  const school = await schoolForUser(user);
  if (!school || school.id !== input.schoolId) throw NOT_FOUND();
  if (input.share) {
    if (input.version !== ADVISOR_CONSENT_VERSION) {
      throw new ApiError(409, "consent_changed", "What advisors can see has changed. Reload the page and read it again.");
    }
    await db
      .insert(advisorGrants)
      .values({ studentUserId: user.id, schoolId: school.id, consentVersion: ADVISOR_CONSENT_VERSION })
      .onConflictDoUpdate({
        target: [advisorGrants.studentUserId, advisorGrants.schoolId],
        set: { consentVersion: ADVISOR_CONSENT_VERSION, grantedAt: sql`now()`, revokedAt: null },
      });
    return { status: "sharing" };
  }
  await db
    .update(advisorGrants)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(advisorGrants.studentUserId, user.id), eq(advisorGrants.schoolId, school.id), isNull(advisorGrants.revokedAt)));
  return { status: "stopped" };
}

// ---- Advisor side ---------------------------------------------------------------------------------

export type SharedStudent = { id: string; email: string };

/** Roster students who share with this school right now. Email only: the advisor already listed it. */
export async function advisorStudentList(advisor: ApprovedAdvisor): Promise<SharedStudent[]> {
  const secret = emailHashSecret();
  if (!secret) return [];
  const granted = await db
    .select({ id: users.id, email: users.email })
    .from(advisorGrants)
    .innerJoin(users, eq(users.id, advisorGrants.studentUserId))
    .where(activeGrant(advisor.school.id));
  if (granted.length === 0) return [];
  const onRoster = new Set(
    (
      await db
        .select({ emailHmac: advisorRoster.emailHmac })
        .from(advisorRoster)
        .where(eq(advisorRoster.schoolId, advisor.school.id))
    ).map((row) => row.emailHmac),
  );
  return granted.filter((row) => onRoster.has(emailHmac(row.email, secret))).sort((left, right) => left.email.localeCompare(right.email));
}

/** The access check for one student. Returns the student's email, or throws "not found". */
export async function requireStudentAccess(advisor: ApprovedAdvisor, studentId: string): Promise<{ email: string }> {
  const secret = emailHashSecret();
  if (!secret) throw NOT_FOUND();
  const [granted] = await db
    .select({ email: users.email })
    .from(advisorGrants)
    .innerJoin(users, eq(users.id, advisorGrants.studentUserId))
    .where(and(eq(advisorGrants.studentUserId, studentId), activeGrant(advisor.school.id)))
    .limit(1);
  if (!granted) throw NOT_FOUND();
  const [onRoster] = await db
    .select({ one: sql<number>`1` })
    .from(advisorRoster)
    .where(and(eq(advisorRoster.schoolId, advisor.school.id), eq(advisorRoster.emailHmac, emailHmac(granted.email, secret))))
    .limit(1);
  if (!onRoster) throw NOT_FOUND();
  return granted;
}

export type StudentDetail = {
  email: string;
  major: string | null;
  year: number | null;
  goal: string | null;
  archetype: ArchetypeCard | null;
  direction: string | null;
  coops: {
    employer: string;
    roleTitle: string;
    roleType: string;
    term: string;
    rotationNumber: number;
    wouldReturn: string;
    ratings: { enjoyment: number; learning: number; mentorship: number; clarityGained: number } | null;
    /** Only when the student marked the note as shared. */
    sharedNote: string | null;
  }[];
};

const GOAL_LABEL = new Map<string, string>(GOAL_OPTIONS.map((option) => [option.value, option.label]));

/** Exactly the consented fields (ADVISOR_FIELDS). No pay, no unshared notes. */
export async function loadStudentDetail(studentId: string, email: string): Promise<StudentDetail> {
  const [people, profileRows, assessmentRows, marks, coopRows] = await db.batch([
    db
      .select({ major: users.major, majorSource: users.majorSource, customMajorText: users.customMajorText, year: users.year })
      .from(users)
      .where(eq(users.id, studentId))
      .limit(1),
    db.select({ goal: profiles.goal }).from(profiles).where(eq(profiles.userId, studentId)).limit(1),
    db
      .select({ instrument: assessments.instrument, scored: assessments.scored })
      .from(assessments)
      .where(eq(assessments.userId, studentId))
      .orderBy(desc(assessments.takenAt))
      .limit(1),
    db
      .select({ nodeId: careerAtlasMarks.nodeId })
      .from(careerAtlasMarks)
      .where(and(eq(careerAtlasMarks.userId, studentId), eq(careerAtlasMarks.mark, "pursuing")))
      .limit(1),
    db
      .select({
        employer: employers.name,
        roleTitle: rotations.roleTitle,
        roleType: rotations.roleType,
        termSeason: rotations.termSeason,
        termYear: rotations.termYear,
        rotationNumber: rotations.rotationNumber,
        wouldReturn: rotations.wouldReturn,
        enjoyment: reviews.enjoyment,
        learning: reviews.learning,
        mentorship: reviews.mentorship,
        clarityGained: reviews.clarityGained,
        freeText: reviews.freeText,
        shareFreeText: reviews.shareFreeText,
      })
      .from(rotations)
      .innerJoin(employers, eq(employers.id, rotations.employerId))
      .leftJoin(reviews, eq(reviews.rotationId, rotations.id))
      .where(eq(rotations.userId, studentId))
      .orderBy(asc(rotations.rotationNumber)),
  ]);
  const person = people[0];
  const latest = assessmentRows[0];
  const scores = latest?.instrument === INSTRUMENT ? scoresFromStored(latest.scored) : null;
  const goal = profileRows[0]?.goal ?? null;
  return {
    email,
    major: person ? displayMajor(person) || null : null,
    year: person?.year ?? null,
    goal: goal ? (GOAL_LABEL.get(goal) ?? null) : null,
    archetype: scores ? archetypeFor(scores) : null,
    direction: chosenDirectionView(marks[0]?.nodeId)?.title ?? null,
    coops: coopRows.map((row) => ({
      employer: row.employer,
      roleTitle: row.roleTitle,
      roleType: careerRoleLabel(row.roleType),
      term: `${row.termSeason[0]?.toUpperCase() ?? ""}${row.termSeason.slice(1)} ${row.termYear}`,
      rotationNumber: row.rotationNumber,
      wouldReturn: row.wouldReturn,
      ratings:
        row.enjoyment == null || row.learning == null || row.mentorship == null || row.clarityGained == null
          ? null
          : { enjoyment: row.enjoyment, learning: row.learning, mentorship: row.mentorship, clarityGained: row.clarityGained },
      sharedNote: row.shareFreeText && row.freeText?.trim() ? row.freeText.trim() : null,
    })),
  };
}

/** Check access, log the view, then load. The log row is written before any student data is read. */
export async function viewStudent(advisor: ApprovedAdvisor, studentId: string): Promise<StudentDetail> {
  const { email } = await requireStudentAccess(advisor, studentId);
  await db.insert(advisorViewLog).values({
    advisorUserId: advisor.userId,
    advisorName: advisor.displayName,
    studentUserId: studentId,
    schoolId: advisor.school.id,
    fields: [...ADVISOR_FIELD_IDS] as AdvisorFieldId[],
  });
  return loadStudentDetail(studentId, email);
}

/** The student's grants and the views of their details, for their account export. */
export async function exportAdvisorAccess(userId: string) {
  const [grants, views] = await Promise.all([
    db
      .select({ school: schools.name, consentVersion: advisorGrants.consentVersion, grantedAt: advisorGrants.grantedAt, revokedAt: advisorGrants.revokedAt })
      .from(advisorGrants)
      .innerJoin(schools, eq(schools.id, advisorGrants.schoolId))
      .where(eq(advisorGrants.studentUserId, userId)),
    studentViewLog(userId),
  ]);
  return { grants, views };
}
