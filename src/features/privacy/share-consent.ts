/** Versioned consent for including co-op reviews in anonymous company pages and Direction. */
export const SHARE_REVIEWS_CONSENT_VERSION = 1;

export const SHARE_REVIEWS_CONSENT_LABEL =
  "Optional: include my co-op reviews in anonymous company pages and in Direction evidence for other signed-in students. You can skip this and still finish onboarding, take the quiz, keep private reviews, and see rule-based Direction. A company page for a major stays hidden until at least 3 different students in that major contribute. Pay ranges need 3 different students who reported pay. A written note is shown only if I choose to share that note. I can turn this on or off later in Settings.";

export function hasShareReviewsConsent(input: {
  shareReviewsConsentAt: Date | null;
  shareReviewsConsentVersion: number | null;
}): boolean {
  return (
    input.shareReviewsConsentAt != null &&
    input.shareReviewsConsentVersion === SHARE_REVIEWS_CONSENT_VERSION
  );
}
