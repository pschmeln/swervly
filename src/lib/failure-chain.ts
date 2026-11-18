import { safeFailureDetail } from "@/lib/sentry-scrub";

const MAX_DEPTH = 8;

const NEXT_CONTROL_DIGESTS = new Set(["HANGING_PROMISE_REJECTION", "NEXT_PRERENDER_INTERRUPTED"]);

const SQLSTATE = /^[0-9A-Z]{5}$/;

function wrapped(error: object): unknown {
  // Drizzle and standard errors use `cause`. The Neon HTTP driver puts the
  // failed fetch error in `sourceError` instead.
  if ("cause" in error && error.cause !== undefined) return error.cause;
  if ("sourceError" in error) return (error as { sourceError?: unknown }).sourceError;
  return undefined;
}

/** The error, then each error it wraps, outermost first. Cycle-safe and bounded. */
export function errorChain(error: unknown): unknown[] {
  const chain: unknown[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current !== undefined && current !== null && !seen.has(current) && chain.length < MAX_DEPTH) {
    seen.add(current);
    chain.push(current);
    current = typeof current === "object" ? wrapped(current) : undefined;
  }
  return chain;
}

/** True when any wrapped error is Next.js ending a render, not a real failure. */
export function isAbortedRender(error: unknown): boolean {
  return errorChain(error).some((item) => {
    if (typeof item !== "object" || item === null) return false;
    const digest = (item as { digest?: unknown }).digest;
    if (typeof digest === "string" && NEXT_CONTROL_DIGESTS.has(digest)) return true;
    const message = item instanceof Error ? item.message : "";
    return message.includes("rejects when the prerender is complete");
  });
}

function errorName(item: unknown): string | undefined {
  return item instanceof Error ? item.name : undefined;
}

export function isDatabaseError(error: unknown): boolean {
  return errorChain(error).some((item) => {
    const name = errorName(item);
    return name === "DrizzleQueryError" || name === "NeonDbError";
  });
}

/**
 * A short label for a database failure that never contains the query, its
 * parameters, or the driver message (those can hold emails and ids).
 * Examples: pg_42703 (missing column), connect_TypeError, NeonDbError.
 */
export function databaseFailureDetail(error: unknown): string {
  const chain = errorChain(error);
  for (const item of chain) {
    if (typeof item !== "object" || item === null) continue;
    const code = (item as { code?: unknown }).code;
    if (typeof code === "string" && SQLSTATE.test(code)) return `pg_${code}`;
  }
  const neon = chain.find((item) => errorName(item) === "NeonDbError");
  if (neon instanceof Error && neon.message.startsWith("Error connecting to database")) {
    const source = safeFailureDetail(errorName((neon as { sourceError?: unknown }).sourceError));
    return source ? `connect_${source}` : "connect";
  }
  return innermostErrorName(error);
}

/** The innermost safe error name, for example AbortError or TypeError. */
export function innermostErrorName(error: unknown): string {
  const chain = errorChain(error);
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const name = safeFailureDetail(errorName(chain[index]));
    if (name) return name;
  }
  return "unknown";
}
