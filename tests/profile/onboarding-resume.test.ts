import { describe, expect, it } from "vitest";
import { onboardingResumeStep } from "@/features/profile/server";

const consentedAt = new Date("2026-01-15T15:00:00.000Z");

describe("onboardingResumeStep", () => {
  it("resumes at step 3 when a profile exists and both consents are set", () => {
    expect(onboardingResumeStep(true, consentedAt, consentedAt)).toBe(3);
  });

  it("starts at step 1 when a profile exists but privacy consent is missing", () => {
    expect(onboardingResumeStep(true, null, consentedAt)).toBe(1);
  });

  it("starts at step 1 when a profile exists but data-use consent is missing", () => {
    expect(onboardingResumeStep(true, consentedAt, null)).toBe(1);
  });

  it("starts at step 1 when a profile exists and both consents are missing", () => {
    expect(onboardingResumeStep(true, null, null)).toBe(1);
  });

  it("starts at step 1 when no profile exists, even if both consents are set", () => {
    expect(onboardingResumeStep(false, consentedAt, consentedAt)).toBe(1);
  });

  it("starts at step 1 when no profile exists and neither consent is set", () => {
    expect(onboardingResumeStep(false, null, null)).toBe(1);
  });
});
