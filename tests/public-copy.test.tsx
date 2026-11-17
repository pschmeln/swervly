import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingPitch } from "@/app/page";
import { NOT_ELIGIBLE_COPY } from "@/app/not-eligible/page";
import PrivacyPage from "@/app/privacy/page";
import { HomeSteps } from "@/app/(app)/home/page";

function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, " ");
}

describe("public copy", () => {
  it("explains the problem and the three steps", () => {
    const html = renderToStaticMarkup(<LandingPitch />);
    const text = visibleText(html);
    expect(text).toContain(
      "Most students pick co-ops with almost no information about what they'll actually enjoy",
    );
    expect(text).toContain("Take the quiz");
    expect(text).toContain("Review your co-ops");
    expect(text).toContain("Get your direction");
    expect(text).toContain(".edu");
    expect(html).toContain("Sign in");
    expect(text).not.toContain("30 interest questions");
    expect(text).not.toContain("UC students");
  });

  it("tells an ineligible visitor the gate is a .edu address", () => {
    expect(NOT_ELIGIBLE_COPY).toContain(".edu");
    expect(NOT_ELIGIBLE_COPY).not.toContain("Sign in with your UC email");
    expect(NOT_ELIGIBLE_COPY).not.toContain("University of Cincinnati");
  });

  it("describes public company views for any .edu student", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    const text = visibleText(html);
    expect(text).toContain("ends in .edu");
    expect(text).toContain("not affiliated with or endorsed by any university");
    expect(text).toContain("does not show names");
    expect(text).toContain("3 students");
    expect(text).toContain("range");
    expect(text.toLowerCase()).toContain("would go back");
    expect(text).toContain("November 17, 2026");
    expect(text).not.toContain("only you can see your profile and co-op reviews");
    expect(text).not.toContain("for UC students");
    expect(text).not.toContain("return offer");
  });
});

describe("home steps", () => {
  it("shows Review your profile and the three steps", () => {
    const html = renderToStaticMarkup(<HomeSteps quizDone canReview rotationCount={1} />);
    expect(html).toContain("Review your profile");
    expect(html).toContain("Take the quiz");
    expect(html).toContain("Review your co-ops");
    expect(html).toContain("Get your direction");
    expect(html).toContain('href="/profile"');
  });
});
