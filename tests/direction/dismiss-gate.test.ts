import { describe, expect, it } from "vitest";
import {
  beginDismiss,
  DISMISS_GATE_IDLE,
  failDismiss,
  succeedDismissAwaitingRefresh,
} from "@/features/direction/components/dismiss-gate";
import { buildDirection } from "@/features/direction/rules";
import type { TraitScores } from "@/features/profile/scoring";

const curious: TraitScores = {
  extraversion: 12,
  agreeableness: 12,
  conscientiousness: 16,
  neuroticism: 10,
  openness: 18,
};

describe("dismiss gate (serialize Not for me)", () => {
  it("allows only one in-flight dismiss; rapid seconds are rejected", () => {
    const first = beginDismiss(DISMISS_GATE_IDLE, "software");
    expect(first).toEqual({ activeRole: "software" });
    expect(beginDismiss(first!, "design")).toBeNull();
    expect(beginDismiss(first!, "software")).toBeNull();
  });

  it("unlocks after a failed request so the student can retry", () => {
    const started = beginDismiss(DISMISS_GATE_IDLE, "software")!;
    expect(failDismiss(started)).toEqual(DISMISS_GATE_IDLE);
    expect(beginDismiss(failDismiss(started), "design")).toEqual({ activeRole: "design" });
  });

  it("stays locked after success until refresh remounts (no second dismiss on a stale list)", () => {
    const started = beginDismiss(DISMISS_GATE_IDLE, "software")!;
    const waiting = succeedDismissAwaitingRefresh(started);
    expect(waiting.activeRole).toBe("software");
    expect(beginDismiss(waiting, "design")).toBeNull();
  });

  it("rapid successive dismissals against server state never invent exhausted while replacements exist", () => {
    const context = { traits: curious, major: "Computer Science", goal: "industry" as const };
    const dismissed: string[] = [];
    let gate = DISMISS_GATE_IDLE;
    // Simulate three rapid taps: only the first begins; the rest are rejected until unlock+new server list.
    const visible = buildDirection(context, [], dismissed).suggestions.map((item) => item.roleType);
    expect(visible.length).toBe(3);

    const attempts = [...visible, "field_site", "research"];
    const started: string[] = [];
    for (const role of attempts) {
      const next = beginDismiss(gate, role);
      if (next) {
        started.push(role);
        gate = succeedDismissAwaitingRefresh(next);
      }
    }
    expect(started).toEqual([visible[0]]);

    // Server applies that one dismiss and returns a full list (replacement), not exhausted.
    dismissed.push(started[0]);
    const after = buildDirection(context, [], dismissed);
    expect(after.exhausted).toBe(false);
    expect(after.suggestions).toHaveLength(3);
    expect(after.suggestions.map((item) => item.roleType)).not.toContain(started[0]);

    // After remount (idle gate) the next dismiss can start against the new server list.
    gate = DISMISS_GATE_IDLE;
    const second = beginDismiss(gate, after.suggestions[0].roleType);
    expect(second?.activeRole).toBe(after.suggestions[0].roleType);
  });

  it("exhausted only when the server says the pool is empty", () => {
    const context = { traits: curious, major: "Computer Science", goal: "industry" as const };
    const every = buildDirection(context, [], []).suggestions.map((item) => item.roleType);
    // Dismiss only the first visible role — pool still has replacements.
    const partial = buildDirection(context, [], [every[0]]);
    expect(partial.exhausted).toBe(false);
    expect(partial.suggestions.length).toBeGreaterThan(0);

    const allRoles = [
      "design",
      "test_validation",
      "manufacturing_process",
      "software",
      "data_analytics",
      "research",
      "field_site",
    ];
    const done = buildDirection(context, [], allRoles);
    expect(done.exhausted).toBe(true);
    expect(done.suggestions).toEqual([]);
  });
});
