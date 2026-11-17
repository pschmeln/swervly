export const INVITE_COOKIE = "swervly_invite";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizeInviteId(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!UUID_RE.test(value)) return null;
  return value.toLowerCase();
}

/** A friend counts only when the cookie names a real user who is not themselves. */
export function inviteTarget(
  raw: string | undefined | null,
  selfId: string,
  knownIds: ReadonlySet<string>,
): string | null {
  const id = normalizeInviteId(raw);
  if (!id || id === selfId.toLowerCase()) return null;
  if (!knownIds.has(id)) return null;
  return id;
}
