import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { feedback, users, type User } from "@/db/schema";
import { mapPasswordErrorCode } from "@/features/auth/password-messages";
import { SHARE_REVIEWS_CONSENT_VERSION } from "@/features/privacy/share-consent";
import type { FeedbackInput, ShareDefaultInput } from "@/features/profile/schemas";
import { ApiError } from "@/lib/api";

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
      mapPasswordErrorCode(typeof code === "string" ? code : undefined) ??
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
