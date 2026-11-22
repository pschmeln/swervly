import { and, desc, eq, exists, gt, inArray, ne, or, sql } from "drizzle-orm";
import { FAMILIES } from "@/content/atlas/taxonomy";
import { COMPANY_FAMILIES } from "@/content/atlas/company-links";
import { COMPANIES } from "@/content/companies";
import { db } from "@/db";
import {
  communityComments,
  communityHelpful,
  communityPosts,
  communityReports,
  employers,
  users,
  type User,
} from "@/db/schema";
import type { FamilyId } from "@/features/atlas/types";
import { careerRoleLabel } from "@/features/direction/career-roles";
import { normalizeEmployerName } from "@/features/review/normalize";
import { ApiError } from "@/lib/api";
import {
  COMMUNITY_TERMS_VERSION,
  EDIT_WINDOW_MS,
  RATE_LIMITS,
  hasCommunityTerms,
  type PostInput,
  type RateAction,
  type ReportReason,
} from "./rules";

/**
 * Community data access. Every write takes the user from the session (apiOnboardedUser) and
 * scopes author-only changes to that user. Reads never return author ids or emails: only
 * `mine` for the viewer's own items. Free text is never logged.
 */

export type PostTag = { kind: "company" | "role" | "area"; label: string };

export type PostSummary = {
  id: string;
  kind: string;
  title: string;
  body: string;
  tags: PostTag[];
  createdAt: Date;
  editedAt: Date | null;
  answerCount: number;
  helpfulCount: number;
  helpedByMe: boolean;
  mine: boolean;
  canEdit: boolean;
};

export type CommentView = {
  id: string;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  helpfulCount: number;
  helpedByMe: boolean;
  mine: boolean;
  canEdit: boolean;
};

export type PostDetail = PostSummary & { deleted: boolean; comments: CommentView[] };

const FAMILY_TITLE = new Map(FAMILIES.map((family) => [family.id, family.title]));

function rows<T>(result: unknown): T[] {
  const list = result && typeof result === "object" && "rows" in result ? (result as { rows: unknown }).rows : result;
  return Array.isArray(list) ? (list as T[]) : [];
}

function editWindowOpen(createdAt: Date, now = Date.now()): boolean {
  return now - createdAt.getTime() < EDIT_WINDOW_MS;
}

// ---- Terms and rate limits ---------------------------------------------------------------

export async function agreeToCommunityTerms(userId: string): Promise<void> {
  await db
    .update(users)
    .set({ communityTermsVersion: COMMUNITY_TERMS_VERSION, communityTermsAt: sql`now()`, updatedAt: sql`now()` })
    .where(eq(users.id, userId));
}

export function requireCommunityTerms(user: User): void {
  if (!hasCommunityTerms(user)) {
    throw new ApiError(403, "community_terms_required", "Agree to the Community rules first.");
  }
}

/**
 * Takes one slot of the student's hourly allowance for an action, or throws 429. One statement:
 * the counter only moves when it is under the cap, so two requests can't both slip past it.
 */
export async function takeRateSlot(userId: string, action: RateAction, now = new Date()): Promise<void> {
  const cap = RATE_LIMITS[action];
  const windowStart = new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000).toISOString();
  const result = await db.execute<{ count: number }>(sql`
    insert into community_rate_buckets (user_id, action, window_start, count)
    values (${userId}::uuid, ${action}, ${windowStart}::timestamptz, 1)
    on conflict (user_id, action, window_start)
    do update set count = community_rate_buckets.count + 1
    where community_rate_buckets.count < ${cap}
    returning count
  `);
  if (rows(result).length === 0) {
    throw new ApiError(429, "rate_limited", "You've reached the hourly limit for this. Try again later.");
  }
}

// ---- Tags ---------------------------------------------------------------------------------

/** Approved employers for the directory companies, for the composer and the company filter. */
export async function directoryEmployers(): Promise<{ id: string; name: string; families: readonly FamilyId[] }[]> {
  const byName = new Map(COMPANIES.map((company) => [normalizeEmployerName(company.name), company]));
  const found = await db
    .select({ id: employers.id, name: employers.name, normalizedName: employers.normalizedName })
    .from(employers)
    .where(and(inArray(employers.normalizedName, [...byName.keys()]), eq(employers.status, "approved")));
  return found
    .map((row) => ({ id: row.id, name: row.name, families: COMPANY_FAMILIES[byName.get(row.normalizedName)?.id ?? ""] ?? [] }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function requireApprovedEmployer(employerId: string): Promise<void> {
  const [row] = await db
    .select({ id: employers.id })
    .from(employers)
    .where(and(eq(employers.id, employerId), eq(employers.status, "approved")))
    .limit(1);
  if (!row) throw new ApiError(400, "invalid_body", "Choose a company from the list.", { employerId: "Choose a company from the list." });
}

function tagsFor(row: { employerName: string | null; roleType: string | null; atlasFamily: string | null }): PostTag[] {
  const tags: PostTag[] = [];
  if (row.employerName) tags.push({ kind: "company", label: row.employerName });
  if (row.roleType) tags.push({ kind: "role", label: careerRoleLabel(row.roleType) });
  if (row.atlasFamily) {
    const title = FAMILY_TITLE.get(row.atlasFamily as FamilyId);
    if (title) tags.push({ kind: "area", label: title });
  }
  return tags;
}

/** Erase a post's text and tags, keep the row for others' answers (D11). */
const TOMBSTONE = {
  title: "",
  body: "",
  status: "deleted",
  statusVersion: sql`${communityPosts.statusVersion} + 1`,
  employerId: null,
  roleType: null,
  atlasFamily: null,
  archetypeId: null,
  archetypeVersion: null,
  updatedAt: sql`now()`,
} as const;

function answeredByOthers(authorId: string) {
  return exists(
    db
      .select({ one: sql`1` })
      .from(communityComments)
      .where(and(eq(communityComments.postId, communityPosts.id), ne(communityComments.authorUserId, authorId))),
  );
}

// ---- Posts --------------------------------------------------------------------------------

export async function createPost(user: User, input: PostInput): Promise<{ id: string }> {
  requireCommunityTerms(user);
  if (input.employerId) await requireApprovedEmployer(input.employerId);
  await takeRateSlot(user.id, "post");
  const [row] = await db
    .insert(communityPosts)
    .values({
      authorUserId: user.id,
      kind: input.kind,
      title: input.title,
      body: input.body,
      employerId: input.employerId ?? null,
      roleType: input.roleType ?? null,
      atlasFamily: input.atlasFamily ?? null,
    })
    .returning({ id: communityPosts.id });
  if (!row) throw new Error("community_post_insert_failed");
  return row;
}

/** Author only, visible posts only, within 15 minutes of posting. */
export async function editPost(user: User, postId: string, input: { title: string; body: string }): Promise<void> {
  const cutoff = new Date(Date.now() - EDIT_WINDOW_MS);
  const updated = await db
    .update(communityPosts)
    .set({ title: input.title, body: input.body, editedAt: sql`now()`, updatedAt: sql`now()` })
    .where(
      and(
        eq(communityPosts.id, postId),
        eq(communityPosts.authorUserId, user.id),
        eq(communityPosts.status, "visible"),
        gt(communityPosts.createdAt, cutoff),
      ),
    )
    .returning({ id: communityPosts.id });
  if (updated.length === 0) {
    throw new ApiError(409, "edit_closed", "You can edit only your own post, within 15 minutes of posting.");
  }
}

/**
 * Author only, any time (D11): a post others answered keeps their answers and becomes an erased
 * tombstone with no author; a post nobody else answered is deleted with its own answers.
 */
export async function deletePost(user: User, postId: string): Promise<void> {
  const [post] = await db
    .select({ id: communityPosts.id })
    .from(communityPosts)
    .where(and(eq(communityPosts.id, postId), eq(communityPosts.authorUserId, user.id), ne(communityPosts.status, "deleted")))
    .limit(1);
  if (!post) throw new ApiError(404, "post_not_found", "Post not found.");
  await db.batch([
    db
      .update(communityPosts)
      .set({ ...TOMBSTONE, authorUserId: null })
      .where(and(eq(communityPosts.id, postId), eq(communityPosts.authorUserId, user.id), answeredByOthers(user.id))),
    db.delete(communityPosts).where(and(eq(communityPosts.id, postId), eq(communityPosts.authorUserId, user.id))),
  ]);
}

export type PostFilters = { employerId?: string | null; roleType?: string | null; families?: readonly FamilyId[] };

/** Employers whose directory companies sit under any of these families (for the direction filter). */
function employersUnder(directory: readonly { id: string; families: readonly FamilyId[] }[], families: readonly FamilyId[]): string[] {
  const wanted = new Set(families);
  return directory.filter((row) => row.families.some((family) => wanted.has(family))).map((row) => row.id);
}

export async function listPosts(
  viewer: User,
  filters: PostFilters,
  directory: readonly { id: string; families: readonly FamilyId[] }[] = [],
  limit = 50,
): Promise<PostSummary[]> {
  const conditions = [eq(communityPosts.status, "visible")];
  if (filters.employerId) conditions.push(eq(communityPosts.employerId, filters.employerId));
  if (filters.roleType) conditions.push(eq(communityPosts.roleType, filters.roleType));
  if (filters.families && filters.families.length > 0) {
    const employerIds = employersUnder(directory, filters.families);
    const byFamily = inArray(communityPosts.atlasFamily, [...filters.families]);
    conditions.push(employerIds.length > 0 ? or(byFamily, inArray(communityPosts.employerId, employerIds))! : byFamily);
  }
  const found = await db
    .select({
      id: communityPosts.id,
      kind: communityPosts.kind,
      title: communityPosts.title,
      body: communityPosts.body,
      authorUserId: communityPosts.authorUserId,
      roleType: communityPosts.roleType,
      atlasFamily: communityPosts.atlasFamily,
      employerName: employers.name,
      createdAt: communityPosts.createdAt,
      editedAt: communityPosts.editedAt,
      answerCount: sql<number>`(select count(*)::int from community_comments c where c.post_id = ${communityPosts.id} and c.status = 'visible')`,
      helpfulCount: sql<number>`(select count(*)::int from community_helpful h where h.post_id = ${communityPosts.id})`,
      helpedByMe: sql<boolean>`exists (select 1 from community_helpful h where h.post_id = ${communityPosts.id} and h.user_id = ${viewer.id}::uuid)`,
    })
    .from(communityPosts)
    .leftJoin(employers, eq(employers.id, communityPosts.employerId))
    .where(and(...conditions))
    .orderBy(desc(communityPosts.createdAt))
    .limit(limit);
  const now = Date.now();
  return found.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    tags: tagsFor(row),
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    answerCount: Number(row.answerCount),
    helpfulCount: Number(row.helpfulCount),
    helpedByMe: Boolean(row.helpedByMe),
    mine: row.authorUserId === viewer.id,
    canEdit: row.authorUserId === viewer.id && editWindowOpen(row.createdAt, now),
  }));
}

/** A visible post or an erased tombstone, with its visible answers. Hidden and removed posts are not found. */
export async function getPost(viewer: User, postId: string): Promise<PostDetail | null> {
  const [row] = await db
    .select({
      id: communityPosts.id,
      kind: communityPosts.kind,
      title: communityPosts.title,
      body: communityPosts.body,
      status: communityPosts.status,
      authorUserId: communityPosts.authorUserId,
      roleType: communityPosts.roleType,
      atlasFamily: communityPosts.atlasFamily,
      employerName: employers.name,
      createdAt: communityPosts.createdAt,
      editedAt: communityPosts.editedAt,
      helpfulCount: sql<number>`(select count(*)::int from community_helpful h where h.post_id = ${communityPosts.id})`,
      helpedByMe: sql<boolean>`exists (select 1 from community_helpful h where h.post_id = ${communityPosts.id} and h.user_id = ${viewer.id}::uuid)`,
    })
    .from(communityPosts)
    .leftJoin(employers, eq(employers.id, communityPosts.employerId))
    .where(and(eq(communityPosts.id, postId), inArray(communityPosts.status, ["visible", "deleted"])))
    .limit(1);
  if (!row) return null;
  const comments = await db
    .select({
      id: communityComments.id,
      body: communityComments.body,
      authorUserId: communityComments.authorUserId,
      createdAt: communityComments.createdAt,
      editedAt: communityComments.editedAt,
      helpfulCount: sql<number>`(select count(*)::int from community_helpful h where h.comment_id = ${communityComments.id})`,
      helpedByMe: sql<boolean>`exists (select 1 from community_helpful h where h.comment_id = ${communityComments.id} and h.user_id = ${viewer.id}::uuid)`,
    })
    .from(communityComments)
    .where(and(eq(communityComments.postId, postId), eq(communityComments.status, "visible")))
    .orderBy(communityComments.createdAt);
  const now = Date.now();
  const deleted = row.status === "deleted";
  return {
    id: row.id,
    kind: row.kind,
    title: deleted ? "" : row.title,
    body: deleted ? "" : row.body,
    tags: deleted ? [] : tagsFor(row),
    createdAt: row.createdAt,
    editedAt: row.editedAt,
    answerCount: comments.length,
    helpfulCount: Number(row.helpfulCount),
    helpedByMe: Boolean(row.helpedByMe),
    mine: !deleted && row.authorUserId === viewer.id,
    canEdit: !deleted && row.authorUserId === viewer.id && editWindowOpen(row.createdAt, now),
    deleted,
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt,
      editedAt: comment.editedAt,
      helpfulCount: Number(comment.helpfulCount),
      helpedByMe: Boolean(comment.helpedByMe),
      mine: comment.authorUserId === viewer.id,
      canEdit: comment.authorUserId === viewer.id && editWindowOpen(comment.createdAt, now),
    })),
  };
}

// ---- Answers ------------------------------------------------------------------------------

export async function createComment(user: User, postId: string, body: string): Promise<{ id: string }> {
  requireCommunityTerms(user);
  const [post] = await db
    .select({ id: communityPosts.id })
    .from(communityPosts)
    .where(and(eq(communityPosts.id, postId), eq(communityPosts.status, "visible")))
    .limit(1);
  if (!post) throw new ApiError(404, "post_not_found", "Post not found.");
  await takeRateSlot(user.id, "comment");
  const [row] = await db
    .insert(communityComments)
    .values({ postId, authorUserId: user.id, body })
    .returning({ id: communityComments.id });
  if (!row) throw new Error("community_comment_insert_failed");
  return row;
}

export async function editComment(user: User, commentId: string, body: string): Promise<void> {
  const cutoff = new Date(Date.now() - EDIT_WINDOW_MS);
  const updated = await db
    .update(communityComments)
    .set({ body, editedAt: sql`now()`, updatedAt: sql`now()` })
    .where(
      and(
        eq(communityComments.id, commentId),
        eq(communityComments.authorUserId, user.id),
        eq(communityComments.status, "visible"),
        gt(communityComments.createdAt, cutoff),
      ),
    )
    .returning({ id: communityComments.id });
  if (updated.length === 0) {
    throw new ApiError(409, "edit_closed", "You can edit only your own answer, within 15 minutes of posting.");
  }
}

export async function deleteComment(user: User, commentId: string): Promise<void> {
  const deleted = await db
    .delete(communityComments)
    .where(and(eq(communityComments.id, commentId), eq(communityComments.authorUserId, user.id)))
    .returning({ id: communityComments.id });
  if (deleted.length === 0) throw new ApiError(404, "comment_not_found", "Answer not found.");
}

// ---- Helpful and reports ------------------------------------------------------------------

async function requireVisibleTarget(target: "post" | "comment", id: string): Promise<void> {
  const found =
    target === "post"
      ? await db.select({ id: communityPosts.id }).from(communityPosts).where(and(eq(communityPosts.id, id), eq(communityPosts.status, "visible"))).limit(1)
      : await db
          .select({ id: communityComments.id })
          .from(communityComments)
          .where(and(eq(communityComments.id, id), eq(communityComments.status, "visible")))
          .limit(1);
  if (found.length === 0) throw new ApiError(404, "not_found", "That post or answer is no longer available.");
}

/** Idempotent: turning Helpful on twice or off twice leaves one state. */
export async function setHelpful(user: User, target: "post" | "comment", id: string, on: boolean): Promise<void> {
  await requireVisibleTarget(target, id);
  await takeRateSlot(user.id, "helpful");
  const column = target === "post" ? communityHelpful.postId : communityHelpful.commentId;
  if (on) {
    await db
      .insert(communityHelpful)
      .values(target === "post" ? { userId: user.id, postId: id } : { userId: user.id, commentId: id })
      .onConflictDoNothing();
  } else {
    await db.delete(communityHelpful).where(and(eq(communityHelpful.userId, user.id), eq(column, id)));
  }
}

/** One report per student per item. The reporter is stored for abuse handling and never shown. */
export async function reportItem(user: User, target: "post" | "comment", id: string, reason: ReportReason): Promise<void> {
  requireCommunityTerms(user);
  await requireVisibleTarget(target, id);
  await takeRateSlot(user.id, "report");
  await db
    .insert(communityReports)
    .values(target === "post" ? { reporterUserId: user.id, postId: id, reason } : { reporterUserId: user.id, commentId: id, reason })
    .onConflictDoNothing();
}

// ---- Account export and deletion (D11) ----------------------------------------------------

/** What the student wrote in Community, for the account export. */
export async function exportCommunity(userId: string) {
  const [posts, comments] = await db.batch([
    db
      .select({
        id: communityPosts.id,
        kind: communityPosts.kind,
        title: communityPosts.title,
        body: communityPosts.body,
        status: communityPosts.status,
        createdAt: communityPosts.createdAt,
        editedAt: communityPosts.editedAt,
      })
      .from(communityPosts)
      .where(eq(communityPosts.authorUserId, userId)),
    db
      .select({
        id: communityComments.id,
        postId: communityComments.postId,
        reviewId: communityComments.reviewId,
        body: communityComments.body,
        status: communityComments.status,
        createdAt: communityComments.createdAt,
        editedAt: communityComments.editedAt,
      })
      .from(communityComments)
      .where(eq(communityComments.authorUserId, userId)),
  ]);
  return { posts, comments };
}

/**
 * Run in the same batch as the users delete (D11). Posts others answered become erased tombstones
 * (the FK then clears the author); the rest are deleted. Comments, Helpful marks, reports and rate
 * counters go with the users row through ON DELETE CASCADE.
 */
export function communityAccountDeletion(userId: string) {
  return [
    db
      .update(communityPosts)
      .set(TOMBSTONE)
      .where(and(eq(communityPosts.authorUserId, userId), answeredByOthers(userId))),
    db.delete(communityPosts).where(and(eq(communityPosts.authorUserId, userId), ne(communityPosts.status, "deleted"))),
  ] as const;
}

