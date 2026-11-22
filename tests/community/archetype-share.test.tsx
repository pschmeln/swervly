import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A drizzle instance that only builds SQL. It records each statement and answers from `respond`.
const captured: { sql: string; params: unknown[] }[] = [];
let respond: (sql: string) => unknown[] = () => [];
vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  return {
    db: drizzle(async (sql, params) => {
      captured.push({ sql, params });
      return { rows: respond(sql) };
    }),
  };
});
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push() {}, refresh() {} }),
}));

import { ARCHETYPES } from "@/content/archetypes";
import { INSTRUMENT } from "@/content/mini-ipip";
import type { User } from "@/db/schema";
import { shareArchetype } from "@/features/community/archetype-share";
import { sharedArchetype } from "@/features/community/archetype-view";
import { PostCard } from "@/features/community/components/post-card";
import { SHARE_EXPLAINER } from "@/features/community/components/share-archetype";
import { ArchetypeShareInput, SHARE_LINE_MAX } from "@/features/community/rules";
import { editPost, type PostSummary } from "@/features/community/server";
import { archetypeFor } from "@/features/profile/archetype";
import { ArchetypeCard } from "@/features/profile/components/archetype-card";

const agreed = { id: "00000000-0000-4000-8000-000000000002", communityTermsVersion: 1 } as User;
// High conscientiousness, everything else in the middle: The Planner.
const PLANNER = { extraversion: 12, agreeableness: 12, conscientiousness: 19, neuroticism: 12, openness: 12 };

beforeEach(() => {
  captured.length = 0;
  respond = () => [];
});

describe("sharing the card", () => {
  it("needs the Community rules first, before touching the database", async () => {
    await expect(shareArchetype({ ...agreed, communityTermsVersion: null } as User, "")).rejects.toMatchObject({ status: 403 });
    expect(captured).toEqual([]);
  });

  it("needs a quiz on file, and inserts nothing without one", async () => {
    await expect(shareArchetype(agreed, "")).rejects.toMatchObject({ status: 409 });
    expect(captured.some((statement) => statement.sql.startsWith("insert"))).toBe(false);
  });

  it("posts the archetype computed from the student's own latest quiz, never one from the request", async () => {
    respond = (sql) => {
      if (sql.includes('from "assessments"')) return [[INSTRUMENT, PLANNER]];
      if (sql.includes("community_rate_buckets")) return [{ count: 1 }];
      if (sql.startsWith('insert into "community_posts"')) return [["00000000-0000-4000-8000-0000000000f1"]];
      return [];
    };
    const result = await shareArchetype(agreed, "Plans first, then coffee.");
    expect(result).toEqual({ id: "00000000-0000-4000-8000-0000000000f1" });
    const insert = captured.find((statement) => statement.sql.startsWith('insert into "community_posts"'))!;
    expect(insert.params).toContain("archetype");
    expect(insert.params).toContain("The Planner");
    expect(insert.params).toContain("planner");
    expect(insert.params).toContain("Plans first, then coffee.");
    expect(insert.params).toContain(agreed.id);
    // The assessment read is scoped to the signed-in student.
    const read = captured.find((statement) => statement.sql.includes('from "assessments"'))!;
    expect(read.params).toContain(agreed.id);
  });

  it("limits the optional line and defaults it to empty", () => {
    expect(ArchetypeShareInput.parse({})).toEqual({ text: "" });
    expect(ArchetypeShareInput.safeParse({ text: "x".repeat(SHARE_LINE_MAX + 1) }).success).toBe(false);
  });

  it("an edit keeps a shared card's archetype name as its title", async () => {
    await expect(editPost(agreed, "00000000-0000-4000-8000-0000000000f1", { title: "Something else", body: "New line" })).rejects.toMatchObject({ status: 409 });
    expect(captured[0]!.sql).toContain(`case when "community_posts"."kind" = 'archetype' then "community_posts"."title" else $1 end`);
  });
});

describe("what other students see", () => {
  it("maps a stored id to its name and description, and ignores unknown ids", () => {
    expect(sharedArchetype("planner")).toEqual(ARCHETYPES.planner);
    expect(sharedArchetype("not-a-real-one")).toBeNull();
    expect(sharedArchetype(null)).toBeNull();
  });

  it("a shared card shows the archetype and the line, and none of the private trait readings", () => {
    const card = archetypeFor(PLANNER);
    const post: PostSummary = {
      id: "00000000-0000-4000-8000-0000000000f1",
      kind: "archetype",
      title: card.name,
      body: "Plans first, then coffee.",
      tags: [],
      archetype: sharedArchetype(card.id),
      createdAt: new Date(),
      editedAt: null,
      answerCount: 0,
      helpfulCount: 0,
      helpedByMe: false,
      mine: false,
      canEdit: false,
    };
    const html = renderToStaticMarkup(<PostCard post={post} now={new Date()} />);
    expect(html).toContain("Work-style card");
    expect(html).toContain(ARCHETYPES.planner.description);
    expect(html).toContain("Plans first, then coffee.");
    for (const trait of card.traits) expect(html).not.toContain(trait);
  });

  it("the card offers Share to Community only where it's asked for", () => {
    const card = archetypeFor(PLANNER);
    expect(renderToStaticMarkup(<ArchetypeCard card={card} share={{ agreed: true }} />)).toContain("Share to Community");
    expect(renderToStaticMarkup(<ArchetypeCard card={card} />)).not.toContain("Share to Community");
    expect(SHARE_EXPLAINER).toContain("trait readings stay private");
  });
});
