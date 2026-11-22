import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));

import PrivacyPage from "@/app/privacy/page";
import { NO_POSTS, PostCard } from "@/features/community/components/post-card";
import { PostComposer } from "@/features/community/components/post-composer";
import {
  COMMUNITY_TERMS,
  hasCommunityTerms,
  PostInput,
  ReportInput,
  timeAgo,
  withinEditWindow,
} from "@/features/community/rules";
import type { PostSummary } from "@/features/community/server";

const post: PostSummary = {
  id: "00000000-0000-4000-8000-000000000009",
  kind: "question",
  title: "What is the first week like at GE Aerospace?",
  archetype: null,
  body: "Starting in January.",
  tags: [{ kind: "company", label: "GE Aerospace" }],
  createdAt: new Date("2026-11-21T10:00:00Z"),
  editedAt: null,
  answerCount: 2,
  helpfulCount: 3,
  helpedByMe: false,
  mine: false,
  canEdit: false,
};

describe("Community rules (item 14)", () => {
  it("validates posts: a question needs a title, advice needs a few sentences", () => {
    expect(PostInput.safeParse({ kind: "question", title: "First week?", body: "" }).success).toBe(true);
    expect(PostInput.safeParse({ kind: "advice", title: "Bring boots", body: "Short" }).success).toBe(false);
    expect(PostInput.safeParse({ kind: "advice", title: "Bring boots", body: "Plants have steel-toe rules." }).success).toBe(true);
    expect(PostInput.safeParse({ kind: "question", title: "Hi", body: "" }).success).toBe(false);
    expect(PostInput.safeParse({ kind: "question", title: "x".repeat(141), body: "" }).success).toBe(false);
    expect(PostInput.safeParse({ kind: "question", title: "Role tag", body: "", roleType: "other" }).success).toBe(false);
    expect(PostInput.safeParse({ kind: "question", title: "Role tag", body: "", roleType: "software" }).success).toBe(true);
    expect(PostInput.safeParse({ kind: "question", title: "Area tag", body: "", atlasFamily: "fam:nope" }).success).toBe(false);
    expect(PostInput.safeParse({ kind: "archetype", title: "Card", body: "" }).success).toBe(false);
    expect(ReportInput.safeParse({ target: "post", id: post.id, reason: "rude" }).success).toBe(false);
  });

  it("allows editing for 15 minutes", () => {
    const created = new Date("2026-11-21T10:00:00Z");
    expect(withinEditWindow(created, new Date("2026-11-21T10:14:59Z"))).toBe(true);
    expect(withinEditWindow(created, new Date("2026-11-21T10:15:00Z"))).toBe(false);
  });

  it("needs the current Community rules", () => {
    expect(hasCommunityTerms({ communityTermsVersion: 1 })).toBe(true);
    expect(hasCommunityTerms({ communityTermsVersion: null })).toBe(false);
    expect(COMMUNITY_TERMS.join(" ")).toContain("without your name");
  });

  it("shows times, never authors", () => {
    const now = new Date("2026-11-21T12:00:00Z");
    expect(timeAgo(new Date("2026-11-21T11:59:30Z"), now)).toBe("just now");
    expect(timeAgo(new Date("2026-11-21T11:00:00Z"), now)).toBe("1 hour ago");
    const html = renderToStaticMarkup(<PostCard post={post} now={now} />);
    expect(html).toContain("2 hours ago");
    expect(html).toContain("2 answers · 3 found this helpful");
    expect(html).toContain("GE Aerospace");
    expect(html).not.toContain("You");
    expect(renderToStaticMarkup(<PostCard post={{ ...post, mine: true }} now={now} />)).toContain(" · You");
    expect(NO_POSTS).toContain("first question");
  });

  it("asks for the rules in the composer only until the student agrees", () => {
    const first = renderToStaticMarkup(<PostComposer employers={[]} agreed={false} defaultArea={null} />);
    expect(first).toContain("I agree to the Community rules");
    const later = renderToStaticMarkup(<PostComposer employers={[]} agreed defaultArea={null} />);
    expect(later).not.toContain("I agree to the Community rules");
    expect(later).toContain("without your name");
  });

  it("says in the privacy policy what Community stores and who sees it", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(html).toContain("If you use");
    expect(html).toContain("Community, we store the posts and answers you write");
    expect(html).toContain("without your name. The founders can see who wrote them.");
    expect(html).toContain("its text and tags are erased");
  });
});
