import { eligibilityErrorForEmail } from "@/lib/email-eligibility";

export const RESEND_COOLDOWN_MS = 30_000;

export type SignUpCredentialsInput = {
  email: string;
  password: string;
  confirm: string;
};

export type SignUpCredentialsErrors = {
  email?: string;
  password?: string;
  confirm?: string;
};

export function validateSignUpCredentials(
  input: SignUpCredentialsInput,
): SignUpCredentialsErrors | null {
  const errors: SignUpCredentialsErrors = {};
  const emailError = eligibilityErrorForEmail(input.email);
  if (emailError) errors.email = emailError;

  if (input.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  } else if (input.password.length > 72) {
    errors.password = "Use 72 characters or fewer.";
  }

  if (input.password !== input.confirm) {
    errors.confirm = "Those passwords don't match.";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export function resendCooldownRemaining(
  lastSentAt: number | null,
  now: number,
  cooldownMs: number = RESEND_COOLDOWN_MS,
): number {
  if (lastSentAt === null) return 0;
  return Math.max(0, cooldownMs - (now - lastSentAt));
}
