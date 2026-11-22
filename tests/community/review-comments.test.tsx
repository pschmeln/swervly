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
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push() {}, refresh() {} }),
}));

import { aggregateAllMajors, aggregateForMajor, companyAverages, type ReviewForAggregate } from "@/features/company/aggregate";
import { PublicMajorSection } from "@/features/company/public-section";
import { NO_NOTE_COMMENTS, ReviewThread } from "@/features/company/review-thread";
import { createReviewComment, visibleNoteReviewIds } from "@/features/company/server";
import { loadReviewComments, type CommentView } from "@/features/community/server";
import type { User } from "@/db/schema";

const EE = "Electrical Engineering";
const R1 = "00000000-0000-4000-8000-0000000000a1";
const R2 = "00000000-0000-4000-8000-0000000000a2";

function review(over: Partial<ReviewForAggregate>): ReviewForAggregate {
  return {
    userId: "u1",
    major: EE,
    wouldReturn: "yes",
    rotationNumber: 1,
    enjoyment: 4,
    learning: 4,
    mentorship: 4,
    clarityGained: 4,
    skillsUsed: [],
    payHourly: null,
    freeText: null,
    shareFreeText: false,
    ...over,
  };
}

const twoStudents = [
  review({ reviewId: R1, userId: "u1", freeText: "Bring boots.", shareFreeText: true }),
  review({ reviewId: R2, userId: "u2", freeText: "Kept private.", shareFreeText: false }),
];

beforeEach(() => {
  captured.length = 0;
});

describe("which notes can carry comments", () => {
  it("only shared notes in the viewer's own major, once that view is visible", () => {
    expect(visibleNoteReviewIds(companyAverages(twoStudents, EE, []))).toEqual([R1]);
    // One student is below the 2-student minimum: no notes, no comments.
    expect(visibleNoteReviewIds(companyAverages(twoStudents.slice(0, 1), EE, []))).toEqual([]);
    // Another major falls back to all majors, which never shows notes.
    expect(visibleNoteReviewIds(companyAverages(twoStudents, "Civil Engineering", []))).toEqual([]);
    expect(aggregateAllMajors(twoStudents, []).sharedNotes).toEqual([]);
    // No major on file: nothing.
    expect(visibleNoteReviewIds(companyAverages(twoStudents, null, []))).toEqual([]);
  });

  it("notes keep their review id, and a preview draft has none", () => {
    const view = aggregateForMajor([...twoStudents, review({ userId: "me", freeText: "Draft", shareFreeText: true })], EE, []);
    expect(view.sharedNotes).toEqual([
      { reviewId: R1, text: "Bring boots." },
      { reviewId: null, text: "Draft" },
    ]);
  });
});

describe("commenting", () => {
  const user = { id: "00000000-0000-4000-8000-000000000002", communityTermsVersion: 1 } as User;

  it("a review that doesn't exist is not found, and nothing is inserted", async () => {
    await expect(createReviewComment(user, R1, "Thanks!")).rejects.toMatchObject({ status: 404 });
    expect(captured).toHaveLength(1);
    expect(captured[0]!.sql).toMatch(/^select .* from "reviews" inner join "rotations"/);
    expect(captured.some((statement) => statement.sql.startsWith("insert"))).toBe(false);
  });

  it("loads only visible comments for the review ids passed in", async () => {
    await loadReviewComments(user, [R1]);
    expect(captured[0]!.sql).toContain('"community_comments"."review_id" in ($');
    expect(captured[0]!.params).toContain(R1);
    expect(captured[0]!.params).toContain("visible");
    captured.length = 0;
    expect(await loadReviewComments(user, [])).toEqual({});
    expect(captured).toEqual([]);
  });
});

describe("rendering", () => {
  const comment: CommentView = {
    id: "00000000-0000-4000-8000-0000000000c1",
    body: "Did you need your own boots?",
    hidden: false,
    createdAt: new Date(),
    editedAt: null,
    helpfulCount: 0,
    helpedByMe: false,
    mine: false,
    canEdit: false,
  };

  it("shows a thread under a shared note on the company page", () => {
    const view = aggregateForMajor(twoStudents, EE, []);
    const html = renderToStaticMarkup(<PublicMajorSection view={view} threads={{ comments: { [R1]: [comment] }, agreed: true }} />);
    expect(html).toContain("Bring boots.");
    expect(html).toContain("1 comment");
    expect(html).toContain("Did you need your own boots?");
    expect(html).toContain("Post comment");
    expect(html).not.toContain("Kept private.");
  });

  it("the review-form preview shows notes without threads", () => {
    const html = renderToStaticMarkup(<PublicMajorSection view={aggregateForMajor(twoStudents, EE, [])} />);
    expect(html).toContain("Bring boots.");
    expect(html).not.toContain("Post comment");
  });

  it("an empty thread invites the first comment and asks for the rules when not yet agreed", () => {
    const html = renderToStaticMarkup(<ReviewThread reviewId={R1} comments={[]} agreed={false} />);
    expect(html).toContain(NO_NOTE_COMMENTS);
    expect(html).toContain("Your comment");
    expect(html).toContain(`answer-body-${R1}`);
  });
});
