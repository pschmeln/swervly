import { describe, expect, it } from "vitest";
import {
  hasShareReviewsConsent,
  SHARE_REVIEWS_CONSENT_VERSION,
} from "@/features/privacy/share-consent";

describe("hasShareReviewsConsent", () => {
  it("requires the current consent version and a timestamp", () => {
    expect(
      hasShareReviewsConsent({
        shareReviewsConsentAt: new Date("2026-11-17T00:00:00.000Z"),
        shareReviewsConsentVersion: SHARE_REVIEWS_CONSENT_VERSION,
      }),
    ).toBe(true);
    expect(
      hasShareReviewsConsent({
        shareReviewsConsentAt: null,
        shareReviewsConsentVersion: SHARE_REVIEWS_CONSENT_VERSION,
      }),
    ).toBe(false);
    expect(
      hasShareReviewsConsent({
        shareReviewsConsentAt: new Date("2026-11-17T00:00:00.000Z"),
        shareReviewsConsentVersion: null,
      }),
    ).toBe(false);
    expect(
      hasShareReviewsConsent({
        shareReviewsConsentAt: new Date("2026-11-17T00:00:00.000Z"),
        shareReviewsConsentVersion: SHARE_REVIEWS_CONSENT_VERSION - 1,
      }),
    ).toBe(false);
  });
});
