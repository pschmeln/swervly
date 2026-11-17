import { describe, expect, it } from "vitest";
import { mapPasswordErrorCode } from "@/features/auth/password-messages";
import {
  RESEND_COOLDOWN_MS,
  resendCooldownRemaining,
  validateSignUpCredentials,
} from "@/features/auth/sign-up-validation";
import { ELIGIBILITY_ERROR_MESSAGE } from "@/lib/email-eligibility";

describe("validateSignUpCredentials", () => {
  it("blocks ineligible email before any Clerk call would run", () => {
    expect(
      validateSignUpCredentials({
        email: "student@gmail.com",
        password: "long-enough-password",
        confirm: "long-enough-password",
      }),
    ).toEqual({ email: ELIGIBILITY_ERROR_MESSAGE });
  });

  it("requires password length and matching confirmation", () => {
    expect(
      validateSignUpCredentials({
        email: "student@uc.edu",
        password: "short",
        confirm: "other",
      }),
    ).toEqual({
      password: "Use at least 8 characters.",
      confirm: "Those passwords don't match.",
    });
  });

  it("accepts an eligible university email with a matching password", () => {
    expect(
      validateSignUpCredentials({
        email: "student@mail.uc.edu",
        password: "long-enough-password",
        confirm: "long-enough-password",
      }),
    ).toBeNull();
  });
});

describe("resendCooldownRemaining", () => {
  it("prevents immediate duplicate resends", () => {
    expect(resendCooldownRemaining(1_000, 1_000 + 5_000)).toBe(RESEND_COOLDOWN_MS - 5_000);
    expect(resendCooldownRemaining(1_000, 1_000 + RESEND_COOLDOWN_MS)).toBe(0);
    expect(resendCooldownRemaining(null, 1_000)).toBe(0);
  });
});

describe("mapPasswordErrorCode", () => {
  it("explains length, strength, breach, and missing password strategy", () => {
    expect(mapPasswordErrorCode("form_password_length_too_short")).toBe("Use at least 8 characters.");
    expect(mapPasswordErrorCode("form_password_not_strong_enough")).toContain("harder to guess");
    expect(mapPasswordErrorCode("form_password_pwned")).toContain("data breach");
    expect(mapPasswordErrorCode("authentication_strategy_not_allowed")).toContain(
      "Sign-up with password",
    );
  });
});
