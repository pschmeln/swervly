import { desc, eq } from "drizzle-orm";
import { INSTRUMENT } from "@/content/mini-ipip";
import { db } from "@/db";
import { assessments, communityPosts, type User } from "@/db/schema";
import { archetypeFor } from "@/features/profile/archetype";
import { scoresFromStored } from "@/features/profile/scoring";
import { ApiError } from "@/lib/api";
import { requireCommunityTerms, takeRateSlot } from "./server";

/**
 * Share the work-style card to Community (item 19). The archetype is recomputed here from the
 * student's latest quiz, never taken from the request, so nobody can post a card they don't have.
 *
 * The post stores the archetype id and version, its name as the title, and the student's optional
 * line. It does not store the three trait lines: those are personal quiz readings, and Community
 * shows only the archetype's name and description.
 */
export async function shareArchetype(user: User, text: string): Promise<{ id: string }> {
  requireCommunityTerms(user);
  const [latest] = await db
    .select({ instrument: assessments.instrument, scored: assessments.scored })
    .from(assessments)
    .where(eq(assessments.userId, user.id))
    .orderBy(desc(assessments.takenAt))
    .limit(1);
  const scores = latest?.instrument === INSTRUMENT ? scoresFromStored(latest.scored) : null;
  if (!scores) throw new ApiError(409, "no_quiz", "Take the work-style quiz first.");
  const card = archetypeFor(scores);
  await takeRateSlot(user.id, "post");
  const [row] = await db
    .insert(communityPosts)
    .values({
      authorUserId: user.id,
      kind: "archetype",
      title: card.name,
      body: text,
      archetypeId: card.id,
      archetypeVersion: card.version,
    })
    .returning({ id: communityPosts.id });
  if (!row) throw new Error("community_post_insert_failed");
  return row;
}
