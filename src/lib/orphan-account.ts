import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { clerkClient } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { communityAccountDeletion } from "@/features/community/server";
import { reportFailure } from "@/lib/sentry";

/**
 * An email can be left owned by a users row whose Clerk account no longer exists: the
 * student deleted their sign-in some other way than Swervly's Delete (Clerk's own account
 * page, or the Clerk dashboard), so the rows stayed. Without this, signing up again with
 * the same email lands on "Account already exists" forever (Nov 25, 2026).
 *
 * Removes that row, the same way deleteAccount removes rows, only when Clerk says the old
 * account is gone (404). Clerk has verified the new sign-in's email, so the person signing
 * up controls the address. Any other Clerk answer, including an outage, keeps the old row
 * and the conflict page. Returns true when a row was removed.
 */
export async function reclaimOrphanedEmail(email: string, newClerkId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id, clerkId: users.clerkId })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!row || row.clerkId === newClerkId) return false;

  try {
    await (await clerkClient()).users.getUser(row.clerkId);
    return false; // The old sign-in still exists: a real conflict.
  } catch (error) {
    if (!(isClerkAPIResponseError(error) && error.status === 404)) return false;
  }

  // Match id, old clerk id and email, so a row changed since the read is never removed.
  // Cascades like deleteAccount: profile, quiz, co-ops, reviews, plans, points.
  await db.batch([
    ...communityAccountDeletion(row.id),
    db.delete(users).where(and(eq(users.id, row.id), eq(users.clerkId, row.clerkId), eq(users.email, email))),
  ]);
  // Logged by row id only, never the email.
  reportFailure("orphaned_account_removed", row.id);
  return true;
}
