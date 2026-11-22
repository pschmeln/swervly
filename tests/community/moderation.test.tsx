import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A drizzle instance that only builds SQL; it records each statement and returns no rows.
const captured: { sql: string; params: unknown[] }[] = [];
vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  return {
    db: drizzle(async (sql, params) => {
      captured.push({ sql, params });
      return { rows: [] };
    }),
  };
});

const session = { email: "student@mail.uc.edu" };
vi.mock("@/lib/auth", () => ({ apiUser: async () => ({ id: "00000000-0000-4000-8000-000000000009", email: session.email }) }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push() {}, refresh() {} }),
}));

import { POST } from "@/app/api/founders/community/route";
import { ModerationQueue, NO_HIDDEN, NO_REPORTS, REMOVE_WARNING } from "@/features/community/components/moderation-queue";
import {
  CommunityModerationInput,
  moderateCommunity,
  moderationStatements,
  reportsByItem,
  splitQueue,
  type QueueItem,
} from "@/features/community/moderation";
import { getPost } from "@/features/community/server";
import type { User } from "@/db/schema";

const ID = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  captured.length = 0;
  process.env.FOUNDER_EMAILS = "founder@swervly.com";
  session.email = "student@mail.uc.edu";
});

describe("moderation statements", () => {
  it("hide matches the version the founder saw, bumps it, and starts only from visible", () => {
    const { change, resolve } = moderationStatements({ target: "post", id: ID, action: "hide", statusVersion: 3 });
    const update = change.toSQL();
    expect(update.sql).toMatch(/^update "community_posts" set "status" = \$1, "status_version" = \$2, "updated_at" = now\(\)/);
    expect(update.sql).toContain('"community_posts"."status_version" = $');
    expect(update.sql).toContain("returning");
    expect(update.params).toEqual(["hidden", 4, ID, 3, "visible"]);
    // Reports close in the same batch, and only if the version moved to 4 (so a stale click closes nothing).
    const close = resolve!.toSQL();
    expect(close.sql).toMatch(/^update "community_reports" set "resolved_at" = now\(\)/);
    expect(close.sql).toContain('"community_reports"."post_id" = $1');
    expect(close.sql).toContain('"community_reports"."resolved_at" is null');
    expect(close.sql).toContain('exists (select 1 from "community_posts"');
    expect(close.params).toEqual([ID, ID, 4]);
  });

  it("restore starts only from hidden, keep only from visible, and answers use the comments table", () => {
    expect(moderationStatements({ target: "post", id: ID, action: "restore", statusVersion: 2 }).change.toSQL().params).toEqual(["visible", 3, ID, 2, "hidden"]);
    expect(moderationStatements({ target: "post", id: ID, action: "keep", statusVersion: 2 }).change.toSQL().params).toEqual(["visible", 3, ID, 2, "visible"]);
    const answer = moderationStatements({ target: "comment", id: ID, action: "hide", statusVersion: 1 });
    expect(answer.change.toSQL().sql).toMatch(/^update "community_comments"/);
    expect(answer.resolve!.toSQL().sql).toContain('"community_reports"."comment_id" = $1');
  });

  it("remove deletes only the version the founder saw, visible or hidden, with nothing left to resolve", () => {
    const { change, resolve } = moderationStatements({ target: "post", id: ID, action: "remove", statusVersion: 5 });
    const del = change.toSQL();
    expect(del.sql).toMatch(/^delete from "community_posts" where/);
    expect(del.params).toEqual([ID, 5, "visible", "hidden"]);
    expect(resolve).toBeNull();
  });

  it("a stale or missing item is a 409, not a silent success", async () => {
    await expect(moderateCommunity({ target: "post", id: ID, action: "remove", statusVersion: 1 })).rejects.toMatchObject({ status: 409 });
  });

  it("validates the body", () => {
    expect(CommunityModerationInput.safeParse({ target: "post", id: ID, action: "hide", statusVersion: 1 }).success).toBe(true);
    expect(CommunityModerationInput.safeParse({ target: "post", id: ID, action: "delete", statusVersion: 1 }).success).toBe(false);
    expect(CommunityModerationInput.safeParse({ target: "post", id: ID, action: "hide", statusVersion: 0 }).success).toBe(false);
    expect(CommunityModerationInput.safeParse({ target: "review", id: ID, action: "hide", statusVersion: 1 }).success).toBe(false);
  });
});

describe("founder-only route", () => {
  const CTX = { params: Promise.resolve({}) };
  const body = JSON.stringify({ target: "post", id: ID, action: "remove", statusVersion: 1 });

  it("answers 404 to a student and runs no SQL", async () => {
    const response = await POST(new Request("http://test/api/founders/community", { method: "POST", body, headers: { "content-type": "application/json" } }), CTX);
    expect(response.status).toBe(404);
    expect(captured).toEqual([]);
  });

  it("lets a founder through (here the item is already gone, so 409)", async () => {
    session.email = "Founder@Swervly.com";
    const response = await POST(new Request("http://test/api/founders/community", { method: "POST", body, headers: { "content-type": "application/json" } }), CTX);
    expect(response.status).toBe(409);
    expect(captured.length).toBe(1);
  });
});

describe("queue shaping", () => {
  const item = (over: Partial<QueueItem>): QueueItem => ({
    target: "post",
    id: ID,
    status: "visible",
    statusVersion: 1,
    title: "Is the night shift worth it?",
    body: "Body",
    postId: ID,
    createdAt: new Date("2026-11-20T12:00:00Z"),
    reports: [],
    ...over,
  });

  it("groups report counts by item, most common reason first, and drops unknown reasons", () => {
    const grouped = reportsByItem([
      { postId: "p1", commentId: null, reason: "spam", count: 1 },
      { postId: "p1", commentId: null, reason: "private_info", count: 2 },
      { postId: null, commentId: "c1", reason: "unsafe", count: 1 },
      { postId: "p1", commentId: null, reason: "made_up", count: 9 },
    ]);
    expect(grouped.get("post:p1")).toEqual([
      { reason: "private_info", count: 2 },
      { reason: "spam", count: 1 },
    ]);
    expect(grouped.get("comment:c1")).toEqual([{ reason: "unsafe", count: 1 }]);
  });

  it("puts reported visible items first by report count, and every hidden item in Hidden", () => {
    const once = item({ id: "a", reports: [{ reason: "spam", count: 1 }] });
    const thrice = item({ id: "b", reports: [{ reason: "spam", count: 3 }] });
    const hidden = item({ id: "c", status: "hidden", reports: [{ reason: "spam", count: 1 }] });
    const quiet = item({ id: "d" });
    const queue = splitQueue([once, hidden, quiet, thrice]);
    expect(queue.reported.map((row) => row.id)).toEqual(["b", "a"]);
    expect(queue.hidden.map((row) => row.id)).toEqual(["c"]);
  });

  it("renders reasons and actions without any reporter or author, and empty states", () => {
    const html = renderToStaticMarkup(
      <ModerationQueue
        reported={[item({ reports: [{ reason: "private_info", count: 2 }] })]}
        hidden={[item({ id: "h", target: "comment", status: "hidden", body: "An answer", title: "Is the night shift worth it?" })]}
      />,
    );
    expect(html).toContain("Shares private information");
    expect(html).toContain("× 2");
    expect(html).toContain("Keep visible");
    expect(html).toContain("Hide");
    expect(html).toContain("Restore");
    expect(html).toContain("Answer to &quot;Is the night shift worth it?&quot;");
    expect(html).not.toContain("@");
    expect(html).not.toContain(REMOVE_WARNING); // only after a founder clicks Remove for good
    const empty = renderToStaticMarkup(<ModerationQueue reported={[]} hidden={[]} />);
    expect(empty).toContain(NO_REPORTS);
    expect(empty).toContain(NO_HIDDEN);
  });
});

describe("hidden items on the post page", () => {
  const viewer = { id: "00000000-0000-4000-8000-000000000002" } as User;

  it("students can't load hidden posts; founders can", async () => {
    await getPost(viewer, ID);
    expect(captured[0]?.params).toContain("visible");
    expect(captured[0]?.params).toContain("deleted");
    expect(captured[0]?.params).not.toContain("hidden");
    captured.length = 0;
    await getPost(viewer, ID, { founder: true });
    expect(captured[0]?.params).toContain("hidden");
  });
});
