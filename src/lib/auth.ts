import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { schoolDomainFromEmail } from "@/features/profile/school";
import { ApiError } from "@/lib/api";
import { captureEvent } from "@/lib/analytics";
import { clerkFailureDetail, isClerkPrerenderFailure } from "@/lib/clerk-failure";
import { EMAIL_CONFLICT_MESSAGE, ROUTES } from "@/lib/constants";
import { isAllowedEmail } from "@/lib/email-eligibility";
import {
  databaseFailureDetail,
  errorChain,
  innermostErrorName,
  isAbortedRender,
  isDatabaseError,
} from "@/lib/failure-chain";
import { createReferralCode, INVITE_COOKIE, normalizeReferralCode, referrerForNewUser } from "@/lib/invites";
import { markReported, reportFailure, setInternalUser } from "@/lib/sentry";

export { isAllowedEmail } from "@/lib/email-eligibility";

type GateResult =
  | { status: "ok"; user: User }
  | { status: "signed_out" }
  | { status: "not_eligible" }
  | { status: "email_conflict" };

// Postgres puts the email in the unique-violation detail. Recognize the
// error by SQLSTATE only, and never log the driver error.
function isUniqueViolation(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

async function ensureUser(
  clerkId: string,
  email: string,
): Promise<{ status: "ok"; user: User } | { status: "email_conflict" }> {
  // No conflict target: ON CONFLICT (clerk_id) still raises 23505 when the
  // email unique index loses a race. The layout and the page both insert on
  // the first request. A different clerk id must not take over that email;
  // the read below is only by clerk id. A missing row means the email is
  // already owned. The driver error includes that email, so it is not logged.
  try {
    const inserted = await db
      .insert(users)
      .values({
        clerkId,
        email,
        school: schoolDomainFromEmail(email),
        referralCode: createReferralCode(),
      })
      .onConflictDoNothing()
      .returning({ id: users.id });
    const createdId = Array.isArray(inserted) ? inserted[0]?.id : undefined;
    if (createdId) {
      await attachInvite(createdId);
      await captureEvent("sign_up", createdId);
    }
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  const user = await findUserByClerkId(clerkId);

  if (!user) {
    reportFailure("user_email_conflict", "email_owned_by_other_clerk");
    return { status: "email_conflict" };
  }

  return { status: "ok", user };
}

async function attachInvite(userId: string): Promise<void> {
  let raw: string | undefined;
  try {
    const { cookies } = await import("next/headers");
    raw = (await cookies()).get(INVITE_COOKIE)?.value;
  } catch {
    return;
  }
  const code = normalizeReferralCode(raw);
  if (!code) return;

  const [inviter] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.referralCode, code))
    .limit(1);
  const inviterId = referrerForNewUser(userId, inviter?.id);
  if (!inviterId) return;

  await db
    .update(users)
    .set({ invitedByUserId: inviterId, updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.invitedByUserId)));
}

async function findUserByClerkId(clerkId: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  return user;
}

// Layout and page renders in one request do not share React.cache, so each
// would otherwise report the same failure. Keyed by the platform request id,
// not by user data.
const resolveReports = new Map<string, number>();

async function readRequestId(): Promise<string | undefined> {
  try {
    const headerList = await headers();
    const id = headerList.get("x-vercel-id") ?? headerList.get("x-request-id");
    if (!id || id.length === 0 || id.length > 200) return undefined;
    return id;
  } catch (error) {
    unstable_rethrow(error);
    return undefined;
  }
}

function duplicateResolveReport(requestId: string, code: string, detail: string): boolean {
  const now = Date.now();
  if (resolveReports.size > 100) {
    for (const [key, at] of resolveReports) {
      if (now - at > 30_000) resolveReports.delete(key);
    }
  }
  const key = `${requestId}\0${code}\0${detail}`;
  const previous = resolveReports.get(key);
  if (previous !== undefined && now - previous < 30_000) return true;
  resolveReports.set(key, now);
  return false;
}

// unstable_rethrow follows `cause` but not Neon's `sourceError`, so a render
// that Next.js cancelled during a database query looked like a real failure.
// Rethrow the wrapped Next.js control-flow error so Next.js handles it.
function rethrowControlFlow(error: unknown): void {
  for (const item of errorChain(error)) unstable_rethrow(item);
}

// resolveUser calls both Clerk and the database. Label each failure by where
// it came from: a failed users query is not a Clerk outage.
export function classifyResolveFailure(error: unknown): { code: string; detail: string } {
  if (isDatabaseError(error)) {
    return { code: "user_lookup_failed", detail: databaseFailureDetail(error) };
  }
  const clerkDetail = clerkFailureDetail(error);
  if (clerkDetail !== "unknown") return { code: "clerk_auth_failed", detail: clerkDetail };
  return { code: "user_resolve_failed", detail: innermostErrorName(error) };
}

function reportResolveFailure(requestId: string | undefined, error: unknown): void {
  // Next.js ending a render (prefetch, prerender) is not an outage.
  if (isClerkPrerenderFailure(error) || isAbortedRender(error)) {
    markReported(error);
    return;
  }
  const { code, detail } = classifyResolveFailure(error);
  if (requestId && duplicateResolveReport(requestId, code, detail)) {
    markReported(error);
    return;
  }
  reportFailure(code, detail, { error });
}

// One in-flight resolution per request. Two requests can still overlap, so
// ensureUser is race-safe on its own.
export const resolveUser = cache(async (): Promise<GateResult> => {
  // headers() postpones the Cache Components shell before any Clerk fetch.
  const requestId = await readRequestId();
  try {
    const session = await auth();
    const clerkId = session.userId;
    if (!clerkId) return { status: "signed_out" };

    const existing = await findUserByClerkId(clerkId);
    if (existing) {
      if (!isAllowedEmail(existing.email)) return { status: "not_eligible" };
      setInternalUser(existing.id);
      return { status: "ok", user: existing };
    }

    // Email is not a default session claim. Fetch it once, when creating the row.
    const clerkUser = await (await clerkClient()).users.getUser(clerkId);
    const email = clerkUser.primaryEmailAddress?.emailAddress.trim().toLowerCase() ?? "";
    if (!email || !isAllowedEmail(email)) return { status: "not_eligible" };

    const ensured = await ensureUser(clerkId, email);
    if (ensured.status !== "ok") return ensured;
    setInternalUser(ensured.user.id);
    return ensured;
  } catch (error) {
    // Static prerender hits Clerk without a request. Those bailouts are not outages.
    // Neon hides a cancelled render's error in sourceError, which
    // unstable_rethrow does not follow; rethrowControlFlow does.
    rethrowControlFlow(error);
    if (isClerkAPIResponseError(error) && error.status === 404) {
      return { status: "signed_out" };
    }
    reportResolveFailure(requestId, error);
    throw error;
  }
});

export async function requireUser(): Promise<User> {
  const result = await resolveUser();
  if (result.status === "signed_out") redirect(ROUTES.signIn);
  if (result.status === "not_eligible") redirect(ROUTES.notEligible);
  if (result.status === "email_conflict") redirect(ROUTES.accountConflict);
  return result.user;
}

export async function requireOnboardedUser(): Promise<User> {
  const user = await requireUser();
  if (!user.onboardedAt) redirect(ROUTES.onboarding);
  return user;
}

export async function apiUser(): Promise<User> {
  const result = await resolveUser();
  if (result.status === "signed_out") {
    throw new ApiError(401, "unauthorized", "Sign in required.");
  }
  if (result.status === "not_eligible") {
    throw new ApiError(
      403,
      "not_eligible",
      "Sign in with a university email that ends in .edu.",
    );
  }
  if (result.status === "email_conflict") {
    throw new ApiError(409, "email_conflict", EMAIL_CONFLICT_MESSAGE);
  }
  return result.user;
}

export async function apiOnboardedUser(): Promise<User> {
  const user = await apiUser();
  if (!user.onboardedAt) {
    throw new ApiError(403, "not_onboarded", "Finish onboarding first.");
  }
  return user;
}
