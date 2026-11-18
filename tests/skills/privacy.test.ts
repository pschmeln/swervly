import { describe, expect, it } from "vitest";
import { SHARE_REVIEWS_CONSENT_VERSION } from "@/features/privacy/share-consent";
import { skillRankEligible } from "@/features/skills/server";

const consented = {
  shareReviewsConsentAt: new Date("2026-03-01T00:00:00.000Z"),
  shareReviewsConsentVersion: SHARE_REVIEWS_CONSENT_VERSION,
};

describe("skill rank privacy", () => {
  it("ignores a review without share consent", () => {
    expect(skillRankEligible({
      major: "Nursing",
      majorSource: "catalog",
      shareReviewsConsentAt: null,
      shareReviewsConsentVersion: null,
    }, "Nursing")).toBe(false);
  });

  it("ignores a custom major even when the stored text matches", () => {
    expect(skillRankEligible({
      major: "Nursing",
      majorSource: "custom",
      ...consented,
    }, "Nursing")).toBe(false);
  });

  it("counts a consented catalog major", () => {
    expect(skillRankEligible({
      major: "Nursing",
      majorSource: "catalog",
      ...consented,
    }, "Nursing")).toBe(true);
  });
});
