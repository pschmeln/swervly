import { createHmac } from "node:crypto";

/**
 * Keyed hash of an email address (HMAC-SHA256 with EMAIL_HASH_SECRET). Used wherever Swervly must
 * match an address without storing it: advisor rosters (item 15) and, later, invite emails (item 1).
 * The secret lives only in the environment; never log it, the address, or the hash next to an address.
 */

/** At least 32 characters, so a short or placeholder value can't be used by mistake. */
export function emailHashSecret(): string | null {
  const secret = process.env.EMAIL_HASH_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailHmac(email: string, secret: string): string {
  return createHmac("sha256", secret).update(normalizeEmail(email)).digest("hex");
}
