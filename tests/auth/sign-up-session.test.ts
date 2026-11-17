import { describe, expect, it } from "vitest";
import {
  needsFinalizeBeforeApp,
  shouldRedirectToApp,
  wouldPrematureNavigateOnComplete,
} from "@/features/auth/sign-up-session";

describe("sign-up session finalization gate", () => {
  it("FAIL-BEFORE: complete without session would have navigated under the old gate", () => {
    expect(
      wouldPrematureNavigateOnComplete({ status: "complete", isSignedIn: false }),
    ).toBe(true);
  });

  it("PASS-AFTER: complete without session does not redirect; needs finalize", () => {
    expect(shouldRedirectToApp(false)).toBe(false);
    expect(needsFinalizeBeforeApp({ status: "complete", isSignedIn: false })).toBe(true);
    expect(wouldPrematureNavigateOnComplete({ status: "complete", isSignedIn: false })).toBe(true);
  });

  it("redirects only after an active session (finalize succeeded or already signed in)", () => {
    expect(shouldRedirectToApp(true)).toBe(true);
    expect(needsFinalizeBeforeApp({ status: "complete", isSignedIn: true })).toBe(false);
    expect(wouldPrematureNavigateOnComplete({ status: "complete", isSignedIn: true })).toBe(false);
  });

  it("does not treat missing_requirements or abandoned as signed-in", () => {
    expect(shouldRedirectToApp(false)).toBe(false);
    expect(needsFinalizeBeforeApp({ status: "missing_requirements", isSignedIn: false })).toBe(
      false,
    );
    expect(needsFinalizeBeforeApp({ status: "abandoned", isSignedIn: false })).toBe(false);
  });

  it("delayed finalize: stays on finalize gate until isSignedIn flips", () => {
    expect(needsFinalizeBeforeApp({ status: "complete", isSignedIn: false })).toBe(true);
    expect(shouldRedirectToApp(false)).toBe(false);
    // After finalize activates the session:
    expect(needsFinalizeBeforeApp({ status: "complete", isSignedIn: true })).toBe(false);
    expect(shouldRedirectToApp(true)).toBe(true);
  });

  it("failed finalize: still needs finalize and must not auto-redirect", () => {
    expect(needsFinalizeBeforeApp({ status: "complete", isSignedIn: false })).toBe(true);
    expect(shouldRedirectToApp(false)).toBe(false);
  });
});
