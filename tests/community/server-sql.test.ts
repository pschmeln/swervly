import { describe, expect, it, vi } from "vitest";

// A drizzle instance that only builds SQL; nothing connects anywhere.
vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  return { db: drizzle(async () => ({ rows: [] })) };
});

import { communityAccountDeletion } from "@/features/community/server";

describe("Community account deletion SQL (D11)", () => {
  it("tombstones posts others answered, then deletes the rest, scoped to the user", () => {
    const [tombstone, remove] = communityAccountDeletion("00000000-0000-4000-8000-000000000001");
    const update = tombstone.toSQL();
    expect(update.sql).toMatch(/^update "community_posts" set "title" = \$1, "body" = \$2, .*"status" = \$\d+, "status_version" = "community_posts"."status_version" \+ 1/);
    expect(update.sql).toContain('"author_user_id" = $');
    expect(update.sql).toContain('exists (select 1 from "community_comments" where ("community_comments"."post_id" = "community_posts"."id" and "community_comments"."author_user_id" <> $');
    expect(update.params).toContain("deleted");
    expect(update.params).toContain("00000000-0000-4000-8000-000000000001");
    const del = remove.toSQL();
    expect(del.sql).toBe('delete from "community_posts" where ("community_posts"."author_user_id" = $1 and "community_posts"."status" <> $2)');
    expect(del.params).toEqual(["00000000-0000-4000-8000-000000000001", "deleted"]);
  });
});
