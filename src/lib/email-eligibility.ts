import { ALLOWED_EMAIL_DOMAINS } from "@/lib/constants";

export const ELIGIBILITY_ERROR_MESSAGE =
  "Swervly currently requires a university email address ending in .edu. Please use your school email.";

export function emailDomain(email: string): string {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0 || at !== normalized.lastIndexOf("@") || at === normalized.length - 1) {
    return "";
  }
  return normalized.slice(at + 1);
}

// Last DNS label must be "edu". includes(".edu") would accept x.edu.evil.com.
export function isEduDomain(domain: string): boolean {
  if (domain.length === 0 || domain.length > 253 || /[\s@/\\]/.test(domain)) return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (labels.some((label) => label.length === 0 || label.length > 63)) return false;
  return labels[labels.length - 1] === "edu";
}

export function isAllowedEmail(
  email: string,
  allowedDomains: readonly string[] = ALLOWED_EMAIL_DOMAINS,
): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  const extras = allowedDomains.map((item) => item.trim().toLowerCase());
  if (extras.includes(domain)) return true;
  return isEduDomain(domain);
}

export function eligibilityErrorForEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed || !trimmed.includes("@") || emailDomain(trimmed).length === 0) {
    return "Enter a valid email address.";
  }
  if (!isAllowedEmail(trimmed)) {
    return ELIGIBILITY_ERROR_MESSAGE;
  }
  return null;
}
