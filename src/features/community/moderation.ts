import { and, desc, eq, exists, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { communityComments, communityPosts, communityReports } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { REPORT_REASONS, type ReportReason } from "./rules";

/**
 * Founder moderation for Community (item 14, D3: posts show at once; a report sends them here).
 * Every caller checks the founder role first (`isFounderEmail` on the session email).
 *
 * Each action names the status_version the founder saw. The update matches only that version and
 * bumps it, so a stale screen can't undo another founder's decision: it gets a 409 instead.
 * Reporter ids and author ids never leave this module.
 */

export const MODERATION_ACTIONS = ["keep", "hide", "restore", "remove"] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

export const CommunityModerationInput = z.object({
  target: z.enum(["post", "comment"]),
  id: z.uuid(),
  action: z.enum(MODERATION_ACTIONS),
  statusVersion: z.number().int().min(1),
});
export type CommunityModerationInput = z.infer<typeof CommunityModerationInput>;

/** Which status an action starts from, and where it leaves the item. */
const TRANSITIONS: Record<Exclude<ModerationAction, "remove">, { from: "visible" | "hidden"; to: "visible" | "hidden" }> = {
  keep: { from: "visible", to: "visible" },
  hide: { from: "visible", to: "hidden" },
  restore: { from: "hidden", to: "visible" },
};

export const STALE_MESSAGE = "Someone else changed this item, or it's gone. Reload the page.";

function table(target: "post" | "comment") {
  return target === "post" ? communityPosts : communityComments;
}

/** The statements for one action, built without running them (tests read their SQL). */
export function moderationStatements(input: CommunityModerationInput) {
  const item = table(input.target);
  if (input.action === "remove") {
    // Cascades to its answers (for a post), Helpful marks and reports, so any private info is gone too.
    return {
      change: db
        .delete(item)
        .where(and(eq(item.id, input.id), eq(item.statusVersion, input.statusVersion), inArray(item.status, ["visible", "hidden"])))
        .returning({ id: item.id }),
      resolve: null,
    };
  }
  const { from, to } = TRANSITIONS[input.action];
  const reportColumn = input.target === "post" ? communityReports.postId : communityReports.commentId;
  return {
    change: db
      .update(item)
      .set({ status: to, statusVersion: input.statusVersion + 1, updatedAt: sql`now()` })
      .where(and(eq(item.id, input.id), eq(item.statusVersion, input.statusVersion), eq(item.status, from)))
      .returning({ id: item.id }),
    // Runs in the same batch: closes open reports only if the change above matched (version is now +1).
    resolve: db
      .update(communityReports)
      .set({ resolvedAt: sql`now()` })
      .where(
        and(
          eq(reportColumn, input.id),
          isNull(communityReports.resolvedAt),
          exists(
            db
              .select({ one: sql`1` })
              .from(item)
              .where(and(eq(item.id, input.id), eq(item.statusVersion, input.statusVersion + 1))),
          ),
        ),
      ),
  };
}

export async function moderateCommunity(input: CommunityModerationInput): Promise<{ id: string }> {
  const { change, resolve } = moderationStatements(input);
  const [changed] = resolve ? await db.batch([change, resolve]) : [await change];
  if (!Array.isArray(changed) || changed.length === 0) throw new ApiError(409, "stale", STALE_MESSAGE);
  return { id: input.id };
}

// ---- Queue -------------------------------------------------------------------------------------

export type QueueItem = {
  target: "post" | "comment";
  id: string;
  status: "visible" | "hidden";
  statusVersion: number;
  /** Post title, or the title of the post an answer belongs to. Empty for review comments. */
  title: string;
  body: string;
  /** Where a founder can read it in context; null when there is no post page (review comments). */
  postId: string | null;
  createdAt: Date;
  reports: { reason: ReportReason; count: number }[];
};

export type ModerationQueue = { reported: QueueItem[]; hidden: QueueItem[] };

type ReportCount = { postId: string | null; commentId: string | null; reason: string; count: number };

export function reportsByItem(counts: readonly ReportCount[]): Map<string, QueueItem["reports"]> {
  const byItem = new Map<string, QueueItem["reports"]>();
  for (const row of counts) {
    const key = row.postId ? `post:${row.postId}` : `comment:${row.commentId}`;
    if (!REPORT_REASONS.includes(row.reason as ReportReason)) continue;
    const list = byItem.get(key) ?? [];
    list.push({ reason: row.reason as ReportReason, count: Number(row.count) });
    byItem.set(key, list);
  }
  for (const list of byItem.values()) list.sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));
  return byItem;
}

function reportTotal(item: QueueItem): number {
  return item.reports.reduce((sum, report) => sum + report.count, 0);
}

/** Reported items (open reports, most reported first) and everything currently hidden. */
export async function loadModerationQueue(limit = 100): Promise<ModerationQueue> {
  const [counts, hiddenPosts, hiddenComments] = await db.batch([
    db
      .select({
        postId: communityReports.postId,
        commentId: communityReports.commentId,
        reason: communityReports.reason,
        count: sql<number>`count(*)::int`,
      })
      .from(communityReports)
      .where(isNull(communityReports.resolvedAt))
      .groupBy(communityReports.postId, communityReports.commentId, communityReports.reason),
    db.select({ id: communityPosts.id }).from(communityPosts).where(eq(communityPosts.status, "hidden")).orderBy(desc(communityPosts.updatedAt)).limit(limit),
    db
      .select({ id: communityComments.id })
      .from(communityComments)
      .where(eq(communityComments.status, "hidden"))
      .orderBy(desc(communityComments.updatedAt))
      .limit(limit),
  ]);
  const reports = reportsByItem(counts);
  const postIds = [...new Set([...counts.flatMap((row) => (row.postId ? [row.postId] : [])), ...hiddenPosts.map((row) => row.id)])];
  const commentIds = [...new Set([...counts.flatMap((row) => (row.commentId ? [row.commentId] : [])), ...hiddenComments.map((row) => row.id)])];

  const [posts, comments] = await Promise.all([
    postIds.length === 0
      ? []
      : db
          .select({
            id: communityPosts.id,
            status: communityPosts.status,
            statusVersion: communityPosts.statusVersion,
            title: communityPosts.title,
            body: communityPosts.body,
            createdAt: communityPosts.createdAt,
          })
          .from(communityPosts)
          .where(and(inArray(communityPosts.id, postIds), inArray(communityPosts.status, ["visible", "hidden"]))),
    commentIds.length === 0
      ? []
      : db
          .select({
            id: communityComments.id,
            status: communityComments.status,
            statusVersion: communityComments.statusVersion,
            body: communityComments.body,
            postId: communityComments.postId,
            postTitle: communityPosts.title,
            createdAt: communityComments.createdAt,
          })
          .from(communityComments)
          .leftJoin(communityPosts, eq(communityPosts.id, communityComments.postId))
          .where(and(inArray(communityComments.id, commentIds), inArray(communityComments.status, ["visible", "hidden"]))),
  ]);

  const items: QueueItem[] = [
    ...posts.map((row) => ({
      target: "post" as const,
      id: row.id,
      status: row.status as QueueItem["status"],
      statusVersion: row.statusVersion,
      title: row.title,
      body: row.body,
      postId: row.id,
      createdAt: row.createdAt,
      reports: reports.get(`post:${row.id}`) ?? [],
    })),
    ...comments.map((row) => ({
      target: "comment" as const,
      id: row.id,
      status: row.status as QueueItem["status"],
      statusVersion: row.statusVersion,
      title: row.postTitle ?? "",
      body: row.body,
      postId: row.postId,
      createdAt: row.createdAt,
      reports: reports.get(`comment:${row.id}`) ?? [],
    })),
  ];
  return splitQueue(items);
}

/** Visible items with open reports go to "reported"; hidden items go to "hidden" whatever their reports. */
export function splitQueue(items: readonly QueueItem[]): ModerationQueue {
  const reported = items
    .filter((item) => item.status === "visible" && item.reports.length > 0)
    .sort((left, right) => reportTotal(right) - reportTotal(left) || right.createdAt.getTime() - left.createdAt.getTime());
  const hidden = items.filter((item) => item.status === "hidden").sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
  return { reported, hidden };
}
