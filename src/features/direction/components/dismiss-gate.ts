/**
 * Serializes "Not for me" for one suggestion list: only one dismiss may be in flight.
 * The visible list stays server-authoritative (applied after refresh remount).
 */

export type DismissGate = {
  /** Role whose dismiss POST is in flight, or null when idle. */
  activeRole: string | null;
};

export const DISMISS_GATE_IDLE: DismissGate = { activeRole: null };

/** Bound the POST so auth/network hangs cannot leave Saving forever. */
export const DISMISS_FETCH_TIMEOUT_MS = 15_000;

/** If refresh never remounts after a successful save, unlock so the student is not stuck. */
export const DISMISS_REFRESH_UNLOCK_MS = 8_000;

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
