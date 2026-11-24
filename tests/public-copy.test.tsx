import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingPitch } from "@/app/page";
import { NOT_ELIGIBLE_COPY } from "@/app/not-eligible/page";
import PrivacyPage from "@/app/privacy/page";

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
      "Most engineering students pick co-ops with almost no information about what they'll actually enjoy",
    );
    expect(text).toContain("Understand how you work");
    expect(text).toContain("Explore and compare");
    expect(text).toContain("Take a next step");
    // A student with no internship history can follow every step.
    expect(text).toContain("No co-op yet? You can do all three steps today.");
    expect(text).not.toContain("Review your co-ops");
    expect(text).not.toContain("co-ops that fit");
    expect(text).toContain(".edu");
    expect(html).toContain("Get started");
    expect(html).toContain('href="/sign-up"');
    expect(html).toContain("Sign in");
    expect(html).toContain('href="/sign-in"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Swervly"');
    expect(html).toContain("/brand/wordmark-on-dark.svg");
    expect(html.match(/Sign in/g)?.length).toBe(1);
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
    // Pages need 2 students; pay needs 3. Each rule is stated once, with its own number.
    expect(text).toContain("least 2 different students in the major");
    expect(text).toContain("at least 3 different students in that group reported pay");
    expect(text).toContain("lowest and highest figures");
    expect(text.toLowerCase()).toContain("would go back");
    expect(text).toContain("turned on sharing");
    expect(text).toContain("Sharing is optional");
    // #57 company averages + #44 pay-3
    expect(text).toContain("each student counts once");
    expect(text).toContain("average across all majors");
    expect(text).toContain("never pay or written notes");
    // #46 Why-we-use-it fit copy
    expect(text).toContain("not a clinical or hiring assessment");
    expect(text).not.toContain("not proof of career fit");
    // #50 Action privacy + Nov 21 date
    expect(text).toContain("November 21, 2026");
    expect(text).toContain("If you use Action");
    expect(text).toContain("Action data is private to you as the student");
    expect(text).toContain("Authorized administrators");
    expect(text).toContain("necessary service providers");
    expect(text).toContain("not shared publicly or with other students");
    expect(text).toContain("export or delete");
    expect(text).not.toContain("only you can see your profile and co-op reviews");
    expect(text).not.toContain("for UC students");
    expect(text).not.toContain("return offer");
  });
});
