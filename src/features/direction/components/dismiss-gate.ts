/**
 * Serializes "Not for me" for one suggestion list: only one dismiss may be in flight.
 * The visible list stays server-authoritative (applied after refresh remount on confirmed ok).
 */

export type DismissGate = {
  /** Role whose dismiss POST is in flight, or null when idle. */
  activeRole: string | null;
};

export const DISMISS_GATE_IDLE: DismissGate = { activeRole: null };

/** Bound the POST so auth/network hangs cannot leave Saving forever. */
export const DISMISS_FETCH_TIMEOUT_MS = 15_000;

/** Bound the reconcile GET after an ambiguous timeout. */
export const DISMISS_RECONCILE_TIMEOUT_MS = 8_000;

/** If refresh never remounts after a successful save, unlock so the student is not stuck. */
export const DISMISS_REFRESH_UNLOCK_MS = 8_000;

export const DISMISS_FAILED_MESSAGE = "Couldn't save that. Try again.";
export const DISMISS_UNKNOWN_MESSAGE =
  "Couldn't confirm whether that saved. Try again or check after a moment.";

/**
 * Sync in-flight claim (ref). Must not live only inside a setState updater —
 * React may apply the updater later, locking Saving without starting the fetch.
 */
export function claimFlight(current: string | null, roleType: string): string | null {
  if (!roleType || current !== null) return null;
  return roleType;
}

/** Start a dismiss, or null if another dismiss is already running. */
export function beginDismiss(gate: DismissGate, roleType: string): DismissGate | null {
  if (!roleType || gate.activeRole !== null) return null;
  return { activeRole: roleType };
}

/** Failed request: unlock so the student can try again; list unchanged. */
export function failDismiss(_gate: DismissGate): DismissGate {
  return DISMISS_GATE_IDLE;
}

/**
 * Successful save: stay locked until the parent remounts with server props.
 * (Calling unlock here would allow a second dismiss against a stale list.)
 */
export function succeedDismissAwaitingRefresh(gate: DismissGate): DismissGate {
  return gate;
}

export type DismissPostResult = "ok" | "failed" | "timeout";

export type ReconcileResult = "dismissed" | "not_dismissed" | "unknown";

export type DismissUiOutcome =
  | { kind: "ok"; refresh: true }
  | { kind: "failed"; refresh: false }
  | { kind: "unknown"; refresh: false };

/**
 * Decide UI outcome. Confirmed network/HTTP failure never refreshes.
 * Timeout needs a reconcile result before claiming fail or ok.
 */
export function outcomeAfterPost(
  post: DismissPostResult,
  reconcile: ReconcileResult | null,
): DismissUiOutcome {
  if (post === "ok") return { kind: "ok", refresh: true };
  if (post === "failed") return { kind: "failed", refresh: false };
  if (reconcile === "dismissed") return { kind: "ok", refresh: true };
  if (reconcile === "not_dismissed") return { kind: "failed", refresh: false };
  return { kind: "unknown", refresh: false };
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const outer = init.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener("abort", () => controller.abort(), { once: true });
  }
  let timer: ReturnType<typeof setTimeout> | null = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    if (timer) clearTimeout(timer);
    timer = null;
  }
}

/**
 * POST dismiss with a hard timeout. Pure enough to unit-test offline / hang / late responses.
 * Never logs the body or headers. Uses Promise.race so a hang unlocks even if fetch ignores abort.
 */
export async function postDismissRole(
  roleType: string,
  options: {
    url: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<DismissPostResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DISMISS_FETCH_TIMEOUT_MS;
  const controller = new AbortController();

  const attempt = (async (): Promise<DismissPostResult> => {
    try {
      const response = await fetchImpl(options.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleType }),
        signal: controller.signal,
      });
      if (!response.ok) return "failed";
      return "ok";
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "AbortError" || name === "TimeoutError") return "timeout";
      return "failed";
    }
  })();

  let timer: ReturnType<typeof setTimeout> | null = null;
  const timedOut = new Promise<DismissPostResult>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve("timeout");
    }, timeoutMs);
  });

  try {
    return await Promise.race([attempt, timedOut]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * After an ambiguous timeout, read server dismiss list without a full-page navigation.
 * Never logs the response body (may contain email / profile fields).
 */
export async function reconcileDismissedRole(
  roleType: string,
  options: {
    url: string;
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
  },
): Promise<ReconcileResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DISMISS_RECONCILE_TIMEOUT_MS;
  try {
    const response = await fetchWithTimeout(fetchImpl, options.url, { method: "GET" }, timeoutMs);
    if (!response.ok) return "unknown";
    const body: unknown = await response.json();
    // Shape from ok(): { ok: true, data: { user, profile } }. Never log body.
    if (!body || typeof body !== "object") return "unknown";
    const payload = (body as { data?: unknown }).data;
    if (!payload || typeof payload !== "object") return "unknown";
    const user = (payload as { user?: unknown }).user;
    if (!user || typeof user !== "object") return "unknown";
    const dismissed = (user as { dismissedCareerRoles?: unknown }).dismissedCareerRoles;
    if (!Array.isArray(dismissed)) return "unknown";
    const roles = dismissed.filter((item): item is string => typeof item === "string");
    return roles.includes(roleType) ? "dismissed" : "not_dismissed";
  } catch {
    return "unknown";
  }
}
