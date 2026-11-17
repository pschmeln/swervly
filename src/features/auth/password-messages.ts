export const PASSWORD_HINT = "Use at least 8 characters. Avoid passwords that are easy to guess.";

export const PASSWORD_MESSAGES: Record<string, string> = {
  form_password_pwned: "That password has appeared in a data breach. Pick a different one.",
  form_password_length_too_short: "Use at least 8 characters.",
  form_password_size_in_bytes_exceeded: "Use 72 characters or fewer.",
  form_password_not_strong_enough: "Use a longer password that is harder to guess.",
  form_password_validation_failed:
    "Use at least 8 characters, and avoid a password that is easy to guess.",
  form_password_incorrect: "That password is incorrect.",
  form_identifier_not_found: "No account found for that email.",
};

const PASSWORD_DISABLED_CODES = new Set([
  "form_param_nil",
  "password_not_enabled",
  "authentication_strategy_not_allowed",
  "strategy_for_user_invalid",
]);

export function mapPasswordErrorCode(code: string | undefined): string | undefined {
  if (!code) return undefined;
  if (PASSWORD_DISABLED_CODES.has(code)) {
    return "Password sign-up is not enabled for this app yet. Ask a founder to turn on Sign-up with password in Clerk.";
  }
  return PASSWORD_MESSAGES[code];
}

export function mapClerkFieldError(
  field: { code: string; message: string; longMessage?: string } | null | undefined,
): string | undefined {
  if (!field) return undefined;
  return mapPasswordErrorCode(field.code) ?? field.longMessage ?? field.message;
}
