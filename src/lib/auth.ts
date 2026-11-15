import { currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { ALLOWED_EMAIL_DOMAINS, ROUTES } from "@/lib/constants";

type GateResult =
  | { status: "ok"; user: User }
  | { status: "signed_out" }
  | { status: "not_eligible" };

function emailDomain(email: string): string {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return "";
  return email.slice(at + 1);
}

function isAllowedEmail(email: string): boolean {
  return ALLOWED_EMAIL_DOMAINS.includes(emailDomain(email));
}

async function resolveUser(): Promise<GateResult> {
  const clerkUser = await currentUser();
  if (!clerkUser) return { status: "signed_out" };

  const email = clerkUser.primaryEmailAddress?.emailAddress.toLowerCase() ?? "";
  if (!email || !isAllowedEmail(email)) return { status: "not_eligible" };

  await db
    .insert(users)
    .values({ clerkId: clerkUser.id, email })
    .onConflictDoNothing({ target: users.clerkId });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkUser.id))
    .limit(1);

  if (!user) {
    throw new Error("User row missing after insert.");
  }

  return { status: "ok", user };
}

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
    throw new ApiError(403, "not_eligible", "Sign in with a UC email.");
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
