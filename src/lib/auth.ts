import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect, unstable_rethrow } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { clerkFailureDetail } from "@/lib/clerk-failure";
import { ALLOWED_EMAIL_DOMAINS, ROUTES } from "@/lib/constants";
import { reportFailure, setInternalUser } from "@/lib/sentry";

type GateResult =
  | { status: "ok"; user: User }
  | { status: "signed_out" }
  | { status: "not_eligible" };

function emailDomain(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0 || at !== normalized.lastIndexOf("@") || at === normalized.length - 1) {
    return "";
  }
  return normalized.slice(at + 1);
}

// Last DNS label must be "edu". includes(".edu") would accept x.edu.evil.com.
function isEduDomain(domain: string): boolean {
  if (domain.length === 0 || domain.length > 253 || /[\s@/\\]/.test(domain)) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (labels.some((label) => label.length === 0 || label.length > 63)) return false;
  return labels[labels.length - 1] === "edu";
}

export function isAllowedEmail(
  email: string,
  allowedDomains: readonly string[] = ALLOWED_EMAIL_DOMAINS,
): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  const extras = allowedDomains.map((item) => item.trim().toLowerCase());
  if (extras.includes(domain)) return true;
  return isEduDomain(domain);
}

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

async function ensureUser(clerkId: string, email: string): Promise<User> {
  // No conflict target: ON CONFLICT (clerk_id) still raises 23505 when the
  // email unique index loses a race. The layout and the page both insert on
  // the first request. A different clerk id must not take over that email;
  // the read below is only by clerk id.
  try {
    await db.insert(users).values({ clerkId, email }).onConflictDoNothing();
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId))
    .limit(1);

  if (!user) {
    throw new Error("User row missing after insert.");
  }

  return user;
}

// One in-flight resolution per request. Two requests can still overlap, so
// ensureUser is race-safe on its own.
const resolveUser = cache(async (): Promise<GateResult> => {
  let clerkUser: Awaited<ReturnType<typeof currentUser>>;
  try {
    clerkUser = await currentUser();
  } catch (error) {
    // Static prerender hits Clerk without a request. Those bailouts are not outages.
    unstable_rethrow(error);
    if (isClerkAPIResponseError(error) && error.status === 404) {
      return { status: "signed_out" };
    }
    reportFailure("clerk_auth_failed", clerkFailureDetail(error), { error });
    throw error;
  }
  if (!clerkUser) return { status: "signed_out" };

  const email = clerkUser.primaryEmailAddress?.emailAddress.trim().toLowerCase() ?? "";
  if (!email || !isAllowedEmail(email)) return { status: "not_eligible" };

  const user = await ensureUser(clerkUser.id, email);
  setInternalUser(user.id);
  return { status: "ok", user };
});

export async function requireUser(): Promise<User> {
  const result = await resolveUser();
  if (result.status === "signed_out") redirect(ROUTES.signIn);
  if (result.status === "not_eligible") redirect(ROUTES.notEligible);
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
  return result.user;
}

export async function apiOnboardedUser(): Promise<User> {
  const user = await apiUser();
  if (!user.onboardedAt) {
    throw new ApiError(403, "not_onboarded", "Finish onboarding first.");
  }
  return user;
}
