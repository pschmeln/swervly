import { errorChain } from "@/lib/failure-chain";

/**
 * Small helpers shared by the server files that talk to Postgres.
 * They read driver shapes only; nothing here logs or returns error text.
 */

/** Rows from `db.execute(...)`: the Neon HTTP driver returns `{ rows }`, pg-proxy in tests returns the array. */
export function resultRows<T = Record<string, unknown>>(result: unknown): T[] {
  const list = result && typeof result === "object" && "rows" in result ? (result as { rows: unknown }).rows : result;
  return Array.isArray(list) ? (list as T[]) : [];
}

/**
 * Postgres unique_violation (23505), optionally on one constraint. Neon-http single
 * queries wrap the Neon error in DrizzleQueryError (`.cause`); db.batch throws it
 * directly; both shapes count. Recognized by SQLSTATE only, never by message text.
 */
export function isUniqueViolation(error: unknown, constraint?: string): boolean {
  return errorChain(error).some((part) => {
    if (typeof part !== "object" || part === null) return false;
    const carrier = part as { code?: unknown; constraint?: unknown };
    return carrier.code === "23505" && (constraint === undefined || carrier.constraint === constraint);
  });
}
