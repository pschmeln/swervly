/**
 * Serializes "Not for me" for one suggestion list: only one dismiss may be in flight.
 * The visible list stays server-authoritative (applied after refresh remount).
 */

export type DismissGate = {
  /** Role whose dismiss POST is in flight, or null when idle. */
  activeRole: string | null;
};

export const DISMISS_GATE_IDLE: DismissGate = { activeRole: null };

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
