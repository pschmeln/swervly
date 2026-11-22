export const INVITE_COOKIE = "swervly_invite";

/** 16 random bytes, hex. URL-safe and not a users.id (those keep their hyphens). */
export const REFERRAL_CODE_LENGTH = 32;

const REFERRAL_CODE_RE = /^[0-9a-f]{32}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createReferralCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(REFERRAL_CODE_LENGTH / 2));
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

/** Cookie and link token. A users.id does not pass. */
export function normalizeReferralCode(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (!REFERRAL_CODE_RE.test(value)) return null;
  return value;
}

/** Old /invite/<users.id> links. They must not set a cookie. */
export function isLegacyInviteUserId(raw: string | undefined | null): boolean {
  if (!raw) return false;
  return UUID_RE.test(raw.trim());
}

/**
 * A friend counts only when the cookie is a real user's code, and not their own.
 * `knownCodes` maps referral code to that user's id.
 */
export function inviteTarget(
  raw: string | undefined | null,
  selfId: string,
  knownCodes: ReadonlyMap<string, string>,
): string | null {
  const code = normalizeReferralCode(raw);
  if (!code) return null;
  const inviterId = knownCodes.get(code);
  if (!inviterId || inviterId === selfId) return null;
  return inviterId;
}

/** The existing self-referral block: never record the new user as their own referrer. */
export function referrerForNewUser(selfId: string, inviterId: string | null | undefined): string | null {
  if (!inviterId || inviterId === selfId) return null;
  return inviterId;
}
