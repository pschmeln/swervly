import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { PRIVACY_POLICY_VERSION } from "./policy-version";

/** The version the student saw. A stale page (older version) is refused, so nobody agrees to text they didn't see. */
export const PolicyAgreeInput = z.object({
  version: z.literal(PRIVACY_POLICY_VERSION, { error: "The policy changed again. Reload the page." }),
});

/** Records agreement to the current policy for the signed-in student only. */
export async function agreeToPolicy(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ privacyPolicyVersion: PRIVACY_POLICY_VERSION, consentPrivacyAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(users.id, userId));
}

/** What changed in each version, shown on the agree-again page. Newest last. */
export const POLICY_CHANGES: Record<number, readonly string[]> = {
  2: [
    "Your location is now a home city (any US city or town) and how far you'd go, or Open to anywhere, plus whether you're open to remote work. If you chose “Cincinnati only” or “Within a drive” before, we set your home city to Cincinnati, OH within 25 or 250 miles. You can change it on your Profile.",
    "Company lists show organizations headquartered in your area first. Nothing is hidden.",
    "You can add the city where you worked to a co-op. It's optional and not shown to other students.",
  ],
};
