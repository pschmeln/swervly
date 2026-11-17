import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { feedback, users, type User } from "@/db/schema";
import { SHARE_REVIEWS_CONSENT_VERSION } from "@/features/privacy/share-consent";
import { ApiError } from "@/lib/api";
import type { FeedbackInput, ShareDefaultInput } from "@/features/profile/schemas";

const PASSWORD_MESSAGES: Record<string, string> = {
  form_password_pwned: "That password has appeared in a data breach. Pick a different one.",
  form_password_length_too_short: "Use at least 8 characters.",
  form_password_size_in_bytes_exceeded: "Use 72 characters or fewer.",
  form_password_not_strong_enough: "Use a longer password that is harder to guess.",
  form_password_validation_failed: "Use at least 8 characters, and avoid a password that is easy to guess.",
};

export async function setPassword(user: User, password: string): Promise<void> {
  try {
    const client = await clerkClient();
    await client.users.updateUser(user.clerkId, {
      password,
      signOutOfOtherSessions: false,
    });
  } catch (error) {
    const code = isClerkAPIResponseError(error) ? error.errors[0]?.code : undefined;
    const message =
      (typeof code === "string" ? PASSWORD_MESSAGES[code] : undefined) ??
      "We could not set that password. Try a different one.";
    throw new ApiError(400, "password_rejected", message, { password: message });
  }
}

export async function saveShareDefault(userId: string, input: ShareDefaultInput): Promise<void> {
  const shareReviews =
    input.shareReviewsConsent === undefined
      ? {}
      : input.shareReviewsConsent
        ? {
            shareReviewsConsentAt: new Date(),
            shareReviewsConsentVersion: SHARE_REVIEWS_CONSENT_VERSION,
          }
        : {
            shareReviewsConsentAt: null,
            shareReviewsConsentVersion: null,
          };

  await db
    .update(users)
    .set({
      shareFreeTextDefault: input.shareFreeTextDefault,
      ...shareReviews,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function saveFeedback(userId: string, input: FeedbackInput): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  await db.insert(feedback).values({
    id,
    userId,
    page: input.page,
    message: input.message,
  });
  return { id };
}
