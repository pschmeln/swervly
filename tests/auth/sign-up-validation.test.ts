import { describe, expect, it } from "vitest";
import {
  mapPasswordErrorCode,
  PASSWORD_TOO_LONG_BYTES,
  utf8ByteLength,
} from "@/features/auth/password-messages";
import {
  RESEND_COOLDOWN_MS,
  resendCooldownRemaining,
  validateSignUpCredentials,
} from "@/features/auth/sign-up-validation";
import { PasswordInput } from "@/features/profile/schemas";
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

  it("rejects passwords that exceed 72 UTF-8 bytes even when character count is ≤72", () => {
    // 25 snowmen (☃ = 3 bytes) => 75 bytes, 25 characters
    const password = "☃".repeat(25);
    expect(password.length).toBe(25);
    expect(utf8ByteLength(password)).toBe(75);
    expect(
      validateSignUpCredentials({
        email: "student@uc.edu",
        password,
        confirm: password,
      }),
    ).toEqual({ password: PASSWORD_TOO_LONG_BYTES });
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
      "Password is not enabled",
    );
  });

  it("does not imply insufficient length for generic form_password_validation_failed", () => {
    const message = mapPasswordErrorCode("form_password_validation_failed");
    expect(message).toBeTruthy();
    expect(message!.toLowerCase()).not.toContain("8 characters");
    expect(message!.toLowerCase()).not.toContain("at least");
    expect(message).toContain("rejected");
  });

  it("describes byte-limit errors in bytes, not characters", () => {
    const message = mapPasswordErrorCode("form_password_size_in_bytes_exceeded");
    expect(message).toBe(PASSWORD_TOO_LONG_BYTES);
    expect(message!.toLowerCase()).toContain("byte");
    expect(message!.toLowerCase()).not.toMatch(/72 characters/);
  });
});

describe("PasswordInput schema byte limit", () => {
  it("accepts 72 ASCII characters and rejects 73", () => {
    expect(PasswordInput.safeParse({ password: "a".repeat(72) }).success).toBe(true);
    expect(PasswordInput.safeParse({ password: "a".repeat(73) }).success).toBe(false);
  });

  it("rejects multibyte passwords over 72 bytes with the bytes message", () => {
    const password = "é".repeat(40); // é is 2 bytes → 80 bytes, 40 chars
    expect(utf8ByteLength(password)).toBe(80);
    const parsed = PasswordInput.safeParse({ password });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe(PASSWORD_TOO_LONG_BYTES);
    }
  });
});
