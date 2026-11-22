/**
 * Pure ownership helpers. Persistence layers must still filter by userId in SQL;
 * these catch logic bugs in memory before a route exists.
 */

export class ActionAuthzError extends Error {
  readonly code = "forbidden" as const;
  constructor(message = "That plan does not belong to you.") {
    super(message);
    this.name = "ActionAuthzError";
  }
}

export type Owned = { userId: string };

/** Return only rows owned by userId. Never trusts a client-supplied owner field beyond the filter. */
export function filterOwned<T extends Owned>(rows: readonly T[], userId: string): T[] {
  if (!userId) return [];
  return rows.filter((row) => row.userId === userId);
}

/** Throw if the row is missing or belongs to someone else (caller maps to 404). */
export function requireOwned<T extends Owned>(row: T | null | undefined, userId: string): T {
  if (!row || !userId || row.userId !== userId) {
    throw new ActionAuthzError();
  }
  return row;
}

/** True when every row in the set belongs to userId (empty set is fine). */
export function allOwned(rows: readonly Owned[], userId: string): boolean {
  if (!userId) return false;
  return rows.every((row) => row.userId === userId);
}
