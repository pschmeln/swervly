import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { advisorAccounts, schoolDomains, schools, users, type User } from "@/db/schema";
import { PRIVACY_POLICY_VERSION } from "@/features/privacy/policy-version";
import { ApiError } from "@/lib/api";
import type { AdvisorRequestInput, FounderAdvisorInput } from "./schemas";

/**
 * Advisor roles (item 15, PR 6.1, D9). A school is a name plus the email domains its people sign
 * in with. An advisor asks for access with their school's sign-in email; a founder approves them.
 * An advisor's access holds only while their status is approved AND their sign-in domain still
 * belongs to that school, checked on every request by requireApprovedAdvisor.
 */

export type SchoolRef = { id: string; name: string };

export type AdvisorState =
  | { kind: "no_school"; domain: string | null }
  | { kind: "can_request"; school: SchoolRef }
  | { kind: "pending" | "approved" | "revoked"; school: SchoolRef; displayName: string };

async function schoolForDomain(domain: string | null): Promise<SchoolRef | null> {
  if (!domain) return null;
  const [row] = await db
    .select({ id: schools.id, name: schools.name })
    .from(schoolDomains)
    .innerJoin(schools, eq(schools.id, schoolDomains.schoolId))
    .where(eq(schoolDomains.domain, domain.toLowerCase()))
    .limit(1);
  return row ?? null;
}

/** What /advisors shows the signed-in person. */
export async function advisorStateFor(user: User): Promise<AdvisorState> {
  const [account] = await db
    .select({ status: advisorAccounts.status, displayName: advisorAccounts.displayName, id: schools.id, name: schools.name })
    .from(advisorAccounts)
    .innerJoin(schools, eq(schools.id, advisorAccounts.schoolId))
    .where(eq(advisorAccounts.userId, user.id))
    .limit(1);
  if (account) {
    const school = { id: account.id, name: account.name };
    if (account.status === "approved") {
      // Approved, but their sign-in domain no longer belongs to the school: no access.
      const current = await schoolForDomain(user.school);
      if (current?.id !== school.id) return { kind: "revoked", school, displayName: account.displayName };
    }
    const kind = account.status === "approved" || account.status === "revoked" ? account.status : "pending";
    return { kind, school, displayName: account.displayName };
  }
  const school = await schoolForDomain(user.school);
  return school ? { kind: "can_request", school } : { kind: "no_school", domain: user.school };
}

export type ApprovedAdvisor = { userId: string; displayName: string; school: SchoolRef };

/**
 * The server-side role check for every advisor page and endpoint (PRs 6.2, 6.3). One query: an
 * approved account whose school still lists the advisor's sign-in domain. Otherwise "not found",
 * so the endpoints don't reveal that they exist.
 */
export async function requireApprovedAdvisor(user: User): Promise<ApprovedAdvisor> {
  const notFound = new ApiError(404, "not_found", "Not found.");
  if (!user.school) throw notFound;
  const [row] = await db
    .select({ displayName: advisorAccounts.displayName, id: schools.id, name: schools.name })
    .from(advisorAccounts)
    .innerJoin(schools, eq(schools.id, advisorAccounts.schoolId))
    .innerJoin(schoolDomains, and(eq(schoolDomains.schoolId, advisorAccounts.schoolId), eq(schoolDomains.domain, user.school.toLowerCase())))
    .where(and(eq(advisorAccounts.userId, user.id), eq(advisorAccounts.status, "approved")))
    .limit(1);
  if (!row) throw notFound;
  return { userId: user.id, displayName: row.displayName, school: { id: row.id, name: row.name } };
}

/**
 * Ask for advisor access. The school comes from the sign-in email's domain, never from the body.
 * Records Privacy Policy agreement for someone who never went through student onboarding.
 */
export async function requestAdvisorAccess(user: User, input: AdvisorRequestInput): Promise<{ status: "pending" }> {
  const school = await schoolForDomain(user.school);
  if (!school) {
    throw new ApiError(404, "school_not_set_up", "Your school isn't set up on Swervly yet. Email support@swervly.com and we'll add it.");
  }
  const [inserted] = await db.batch([
    db
      .insert(advisorAccounts)
      .values({ userId: user.id, schoolId: school.id, displayName: input.displayName })
      .onConflictDoNothing()
      .returning({ userId: advisorAccounts.userId }),
    db
      .update(users)
      .set({ consentPrivacyAt: sql`now()`, privacyPolicyVersion: PRIVACY_POLICY_VERSION, updatedAt: sql`now()` })
      .where(and(eq(users.id, user.id), isNull(users.consentPrivacyAt))),
  ]);
  if (inserted.length === 0) {
    throw new ApiError(409, "already_requested", "You've already asked for advisor access. The founders will decide.");
  }
  return { status: "pending" };
}

// ---- Founders -----------------------------------------------------------------------------------

export type FounderSchool = SchoolRef & { domains: string[] };
export type FounderAdvisor = {
  userId: string;
  email: string;
  displayName: string;
  schoolName: string;
  status: string;
  requestedAt: Date;
  decidedAt: Date | null;
};

/** Everything the founders' Schools and advisors section shows. Founders only (caller checks). */
export async function founderAdvisorOverview(): Promise<{ schools: FounderSchool[]; advisors: FounderAdvisor[] }> {
  const [schoolRows, domainRows, advisorRows] = await db.batch([
    db.select({ id: schools.id, name: schools.name }).from(schools).orderBy(asc(schools.name)),
    db.select({ domain: schoolDomains.domain, schoolId: schoolDomains.schoolId }).from(schoolDomains).orderBy(asc(schoolDomains.domain)),
    db
      .select({
        userId: advisorAccounts.userId,
        email: users.email,
        displayName: advisorAccounts.displayName,
        schoolName: schools.name,
        status: advisorAccounts.status,
        requestedAt: advisorAccounts.requestedAt,
        decidedAt: advisorAccounts.decidedAt,
      })
      .from(advisorAccounts)
      .innerJoin(users, eq(users.id, advisorAccounts.userId))
      .innerJoin(schools, eq(schools.id, advisorAccounts.schoolId))
      .orderBy(asc(advisorAccounts.requestedAt)),
  ]);
  const bySchool = new Map<string, string[]>();
  for (const row of domainRows) bySchool.set(row.schoolId, [...(bySchool.get(row.schoolId) ?? []), row.domain]);
  return {
    schools: schoolRows.map((row) => ({ ...row, domains: bySchool.get(row.id) ?? [] })),
    advisors: sortAdvisors(advisorRows),
  };
}

/** Pending first (oldest first, so nobody waits longest), then approved, then revoked. */
export function sortAdvisors<T extends { status: string; requestedAt: Date }>(rows: readonly T[]): T[] {
  const rank: Record<string, number> = { pending: 0, approved: 1, revoked: 2 };
  return [...rows].sort((left, right) => (rank[left.status] ?? 3) - (rank[right.status] ?? 3) || left.requestedAt.getTime() - right.requestedAt.getTime());
}

async function domainsTakenElsewhere(domains: readonly string[], schoolId: string | null): Promise<string[]> {
  const taken = await db
    .select({ domain: schoolDomains.domain, schoolId: schoolDomains.schoolId })
    .from(schoolDomains)
    .where(inArray(schoolDomains.domain, [...domains]));
  return taken.filter((row) => row.schoolId !== schoolId).map((row) => row.domain);
}

function takenError(domains: readonly string[]): ApiError {
  const message = `${domains.join(", ")} already ${domains.length === 1 ? "belongs" : "belong"} to another school.`;
  return new ApiError(409, "domain_taken", message, { domains: message });
}

function isUniqueViolation(error: unknown): boolean {
  const code = (error as { code?: string; cause?: { code?: string } } | null)?.code ?? (error as { cause?: { code?: string } } | null)?.cause?.code;
  return code === "23505";
}

export async function founderAdvisorAction(founder: User, input: FounderAdvisorInput): Promise<{ id: string }> {
  if (input.action === "create_school") {
    const taken = await domainsTakenElsewhere(input.domains, null);
    if (taken.length > 0) throw takenError(taken);
    const id = randomUUID();
    try {
      await db.batch([
        db.insert(schools).values({ id, name: input.name }),
        db.insert(schoolDomains).values(input.domains.map((domain) => ({ domain, schoolId: id }))),
      ]);
    } catch (error) {
      if (isUniqueViolation(error)) throw new ApiError(409, "school_exists", "A school with that name or domain already exists.", { name: "A school with that name or domain already exists." });
      throw error;
    }
    return { id };
  }

  if (input.action === "set_domains") {
    const [school] = await db.select({ id: schools.id }).from(schools).where(eq(schools.id, input.schoolId)).limit(1);
    if (!school) throw new ApiError(404, "not_found", "That school no longer exists.");
    const taken = await domainsTakenElsewhere(input.domains, school.id);
    if (taken.length > 0) throw takenError(taken);
    await db.batch([
      db.delete(schoolDomains).where(and(eq(schoolDomains.schoolId, school.id), notInArray(schoolDomains.domain, input.domains))),
      db
        .insert(schoolDomains)
        .values(input.domains.map((domain) => ({ domain, schoolId: school.id })))
        .onConflictDoNothing(),
    ]);
    return { id: school.id };
  }

  // decide_advisor: approve from pending or revoked; revoke from pending or approved.
  const from = input.decision === "approve" ? ["pending", "revoked"] : ["pending", "approved"];
  const updated = await db
    .update(advisorAccounts)
    .set({ status: input.decision === "approve" ? "approved" : "revoked", decidedAt: sql`now()`, decidedByUserId: founder.id })
    .where(and(eq(advisorAccounts.userId, input.userId), inArray(advisorAccounts.status, from)))
    .returning({ userId: advisorAccounts.userId });
  if (updated.length === 0) throw new ApiError(409, "stale", "Someone else changed this request, or it's gone. Reload the page.");
  return { id: input.userId };
}

// ---- Account export ------------------------------------------------------------------------------

/** The person's own advisor account, if any, for the account export. */
export async function exportAdvisor(userId: string) {
  const [account] = await db
    .select({
      school: schools.name,
      displayName: advisorAccounts.displayName,
      status: advisorAccounts.status,
      requestedAt: advisorAccounts.requestedAt,
      decidedAt: advisorAccounts.decidedAt,
    })
    .from(advisorAccounts)
    .innerJoin(schools, eq(schools.id, advisorAccounts.schoolId))
    .where(eq(advisorAccounts.userId, userId))
    .limit(1);
  return { account: account ?? null };
}
