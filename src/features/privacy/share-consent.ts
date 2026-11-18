/**
 * Versioned consent for including co-op reviews in anonymous company pages and Direction.
 * v1 (Nov 2026): 3-student minimum. v2 (Nov 18, 2026): 2-student minimum, for pages and pay.
 * Consent given to an older version no longer counts; the student is asked again.
 */
export const SHARE_REVIEWS_CONSENT_VERSION = 2;

export const SHARE_REVIEWS_CONSENT_LABEL =
  "Optional: include my co-op reviews in anonymous company pages and in Direction evidence for other signed-in students. You can skip this and still finish onboarding, take the quiz, keep private reviews, and see rule-based Direction. A company page for a major stays hidden until at least 2 different students in that major contribute. Pay ranges need 2 different students who reported pay. A written note is shown only if I choose to share that note. I can turn this on or off later in Settings.";

/** True when the student agreed to an older version of the sharing terms. */
export function hasOutdatedShareReviewsConsent(input: {
  shareReviewsConsentAt: Date | null;
  shareReviewsConsentVersion: number | null;
}): boolean {
  return input.shareReviewsConsentAt != null && input.shareReviewsConsentVersion !== SHARE_REVIEWS_CONSENT_VERSION;
}

export function hasShareReviewsConsent(input: {
  shareReviewsConsentAt: Date | null;
  shareReviewsConsentVersion: number | null;
}): boolean {
  return (
    input.shareReviewsConsentAt != null &&
    input.shareReviewsConsentVersion === SHARE_REVIEWS_CONSENT_VERSION
  );
}
