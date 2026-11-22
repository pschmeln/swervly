/**
 * Version of the privacy policy (/privacy) and the onboarding consent text.
 * v1: up to Nov 21, 2026. v2: home city and radius replace the Cincinnati-only choice,
 * optional work city on co-ops (Stage 3, PR 3.1).
 *
 * Raise it only when a change affects people who already agreed (what is collected, who can
 * see it, what it is used for). Everyone below the current version is asked to agree again
 * before using the app (see needsPolicyAgreement).
 */
export const PRIVACY_POLICY_VERSION = 2;

/** Last updated date shown on /privacy. */
export const PRIVACY_POLICY_UPDATED = "November 21, 2026";

/** True for someone who agreed to an older policy. People who never agreed go through onboarding. */
export function needsPolicyAgreement(user: { consentPrivacyAt: Date | null; privacyPolicyVersion: number | null }): boolean {
  return user.consentPrivacyAt != null && (user.privacyPolicyVersion ?? 0) < PRIVACY_POLICY_VERSION;
}
