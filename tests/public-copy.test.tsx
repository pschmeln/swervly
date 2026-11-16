import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingPitch } from "@/app/page";
import { NOT_ELIGIBLE_COPY } from "@/app/not-eligible/page";
import PrivacyPage from "@/app/privacy/page";

describe("public copy", () => {
  it("pitches what exists now and what comes later", () => {
    const html = renderToStaticMarkup(<LandingPitch />);
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain(
      "Built for University of Cincinnati students, and open to any university email.",
    );
    expect(text).toContain("30 interest questions");
    expect(text).toContain("six RIASEC interest scores");
    expect(text).toContain("employer insights, pay ranges");
    expect(text).toContain("not in the product today");
    expect(text).toContain("Swervly is free");
    expect(html).toContain("Sign in");
    expect(text).not.toContain(
      "University of Cincinnati students keep a record of their co-ops",
    );
  });

  it("tells an ineligible visitor the gate is any university email", () => {
    expect(NOT_ELIGIBLE_COPY).toBe(
      "Swervly is built for University of Cincinnati students and open to any university email. Sign in with an address that ends in .edu.",
    );
    expect(NOT_ELIGIBLE_COPY).not.toContain("Sign in with your UC email");
  });

  it("describes collection for students who are not at UC", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(text).toContain("built for University of Cincinnati (UC) students");
    expect(text).toContain("open to anyone with a university email");
    expect(text).toContain("the school you report");
    expect(text).toContain("recommendations for students");
    expect(text).toContain("show other students");
    expect(text).toContain("university email accounts that end in .edu");
    expect(text).toContain("not affiliated with or endorsed by the University of Cincinnati");
    expect(text).toContain("November 16, 2026");
    expect(text).not.toContain("your UC email");
    expect(text).not.toContain("recommendations for UC students");
    expect(text).not.toContain("eligible UC email");
  });
});
