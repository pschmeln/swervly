import { describe, expect, it, vi } from "vitest";
import {
  beginDismiss,
  claimFlight,
  DISMISS_FETCH_TIMEOUT_MS,
  DISMISS_GATE_IDLE,
  failDismiss,
  postDismissRole,
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

  it("claimFlight is sync and rejects a second claim while busy", () => {
    expect(claimFlight(null, "software")).toBe("software");
    expect(claimFlight("software", "design")).toBeNull();
    expect(claimFlight(null, "")).toBeNull();
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

    dismissed.push(started[0]);
    const after = buildDirection(context, [], dismissed);
    expect(after.exhausted).toBe(false);
    expect(after.suggestions).toHaveLength(3);
    expect(after.suggestions.map((item) => item.roleType)).not.toContain(started[0]);

    gate = DISMISS_GATE_IDLE;
    const second = beginDismiss(gate, after.suggestions[0].roleType);
    expect(second?.activeRole).toBe(after.suggestions[0].roleType);
  });

  it("exhausted only when the server says the pool is empty", () => {
    const context = { traits: curious, major: "Computer Science", goal: "industry" as const };
    const every = buildDirection(context, [], []).suggestions.map((item) => item.roleType);
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

describe("postDismissRole (offline / timeout / recovery)", () => {
  it("offline failure → unlock → reconnect retry starts a fresh POST", async () => {
    const calls: string[] = [];
    let flight: string | null = null;

    const offlineFetch: typeof fetch = async () => {
      calls.push("offline");
      throw new TypeError("Failed to fetch");
    };
    const onlineFetch: typeof fetch = async () => {
      calls.push("online");
      return new Response(JSON.stringify({ roleType: "software" }), { status: 200 });
    };

    // Attempt 1 (offline): claim, POST fails, release.
    expect(claimFlight(flight, "software")).toBe("software");
    flight = "software";
    expect(await postDismissRole("software", { url: "/api/direction/dismiss", fetchImpl: offlineFetch })).toBe(
      "failed",
    );
    flight = null;

    // Attempt 2 (online): new claim must succeed and POST must run.
    expect(claimFlight(flight, "software")).toBe("software");
    flight = "software";
    expect(await postDismissRole("software", { url: "/api/direction/dismiss", fetchImpl: onlineFetch })).toBe("ok");
    expect(calls).toEqual(["offline", "online"]);
  });

  it("token/network hang times out and releases for retry", async () => {
    const hungFetch: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        });
      });

    const started = Date.now();
    const result = await postDismissRole("design", {
      url: "/api/direction/dismiss",
      fetchImpl: hungFetch,
      timeoutMs: 50,
    });
    expect(result).toBe("timeout");
    expect(Date.now() - started).toBeLessThan(DISMISS_FETCH_TIMEOUT_MS);
    // After timeout the UI unlocks; a new claim works.
    expect(claimFlight(null, "design")).toBe("design");
  });

  it("late success after a prior timeout is treated as a separate attempt (serialize)", async () => {
    const late = {
      resolve: (_value: Response) => {},
    };
    const lateFetch: typeof fetch = () =>
      new Promise((resolve) => {
        late.resolve = resolve;
      });

    const pending = postDismissRole("field_site", {
      url: "/api/direction/dismiss",
      fetchImpl: lateFetch,
      timeoutMs: 30,
    });
    // Timed out while still in flight on the wire — UI unlocks; do not start a concurrent dismiss.
    await expect(pending).resolves.toBe("timeout");
    // Late response arrives afterward (ignored by the timed-out attempt).
    late.resolve(new Response("{}", { status: 200 }));
    // Student may retry only after unlock; still one at a time.
    let flight: string | null = null;
    flight = claimFlight(flight, "field_site");
    expect(flight).toBe("field_site");
    expect(claimFlight(flight, "research")).toBeNull();
  });

  it("HTTP error fails without leaving the slot claimed in the helper", async () => {
    const bad: typeof fetch = async () => new Response("nope", { status: 500 });
    expect(await postDismissRole("software", { url: "/api/direction/dismiss", fetchImpl: bad })).toBe("failed");
  });
});
