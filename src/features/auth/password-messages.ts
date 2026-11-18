export const PASSWORD_HINT =
  "Use at least 8 characters. Avoid passwords that are easy to guess. Max 72 bytes (emoji can use more than one byte each).";

export const PASSWORD_TOO_LONG_BYTES =
  "Use 72 bytes or fewer. Emoji and some symbols use more than one byte.";

export const PASSWORD_MESSAGES: Record<string, string> = {
  form_password_pwned: "That password has appeared in a data breach. Pick a different one.",
  form_password_length_too_short: "Use at least 8 characters.",
  form_password_size_in_bytes_exceeded: PASSWORD_TOO_LONG_BYTES,
  form_password_not_strong_enough: "Use a longer password that is harder to guess.",
  // Generic validation — do not imply length unless Clerk sent a length-specific code.
  form_password_validation_failed:
    "That password was rejected. Try a different one that is harder to guess.",
  form_password_incorrect: "That password is incorrect.",
  form_identifier_not_found: "No account found for that email.",
};

const PASSWORD_DISABLED_CODES = new Set([
  "form_param_nil",
  "password_not_enabled",
  "authentication_strategy_not_allowed",
  "strategy_for_user_invalid",
]);

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function mapPasswordErrorCode(code: string | undefined): string | undefined {
  if (!code) return undefined;
  if (PASSWORD_DISABLED_CODES.has(code)) {
    return "Password is not enabled for this app yet. Ask a founder to turn on password in Clerk.";
  }
  return PASSWORD_MESSAGES[code];
}

export function mapClerkFieldError(
  field: { code: string; message: string; longMessage?: string } | null | undefined,
): string | undefined {
  if (!field) return undefined;
  return mapPasswordErrorCode(field.code) ?? field.longMessage ?? field.message;
}
