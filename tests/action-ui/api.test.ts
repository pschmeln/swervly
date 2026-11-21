import { describe, expect, it } from "vitest";
import { dispatchAction, loadAfterDispatch } from "@/features/action-ui/api";
import { filledBundle, filledDashboard, MOCK_PURSUING } from "@/features/action-ui/mock";
import type { DashboardLoad } from "@/features/action-ui/types";
import { ACTION_UNAVAILABLE_MESSAGE, NO_PURSUING_MESSAGE, showsAsSaved } from "@/features/action-ui/view";

const now = new Date("2026-11-18T15:00:00.000Z");

function ready(): DashboardLoad {
  return { status: "ready", dashboard: filledDashboard(now) };
}

describe("dispatchAction", () => {
  it("keeps the plan unchanged when a rating fails", async () => {
    const current = ready();
    const skill = current.status === "ready" ? current.dashboard.skills[0] : null;
    const result = await dispatchAction({
      source: "api",
      load: current,
      retry: { kind: "rate-skill", id: skill?.id ?? "", progress: "learning" },
      pursuing: null,
      now,
      fetchImpl: async () => Response.json({ ok: false, error: { code: "server_error", message: "Could not save your rating." } }, { status: 500 }),
    });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("Could not save your rating.");
    expect(loadAfterDispatch(current, result)).toBe(current);
    expect(showsAsSaved("error")).toBe(false);
    expect(skill?.progress).toBe("comfortable");
  });

  it("turns a 503 into the unavailable state", async () => {
    const current = ready();
    const result = await dispatchAction({
      source: "api",
      load: current,
      retry: { kind: "update-task", id: current.status === "ready" ? current.dashboard.tasks[0].id : "", patch: { title: "Unsaved title" } },
      pursuing: null,
      fetchImpl: async () =>
        Response.json({ ok: false, error: { code: "action_unavailable", message: ACTION_UNAVAILABLE_MESSAGE } }, { status: 503 }),
    });
    expect(result.unavailable).toBe(true);
    expect(loadAfterDispatch(current, result)).toEqual({ status: "unavailable" });
    if (current.status === "ready") expect(current.dashboard.tasks[0].title.startsWith("Practice:")).toBe(true);
  });

  it("reloads after plan_exists and does not report success", async () => {
    const calls: string[] = [];
    const result = await dispatchAction({
      source: "api",
      load: { status: "empty" },
      retry: { kind: "seed-atlas", weeklyHours: null, horizonWeeks: null },
      pursuing: MOCK_PURSUING,
      fetchImpl: async (_url, init) => {
        calls.push(init?.method ?? "GET");
        if (init?.method === "POST") {
          const body = JSON.parse(String(init.body));
          expect(body).toEqual({ goal: { mode: "atlas_pursuing" } });
          return Response.json(
            { ok: false, error: { code: "plan_exists", message: "You already have an active plan. Change the goal or revise it instead." } },
            { status: 409 },
          );
        }
        return Response.json({ ok: true, data: filledBundle(now) });
      },
    });
    expect(calls).toEqual(["POST", "GET"]);
    expect(result.ok).toBe(false);
    expect(result.recovered?.status).toBe("ready");
    expect(showsAsSaved(result.ok ? "saved" : "error")).toBe(false);
  });

  it("reports a network failure without applying the edit", async () => {
    const current = ready();
    const result = await dispatchAction({
      source: "api",
      load: current,
      retry: { kind: "settings", weeklyHours: 9, horizonWeeks: 2 },
      pursuing: null,
      fetchImpl: async () => {
        throw new Error("offline");
      },
    });
    expect(result.ok).toBe(false);
    expect(loadAfterDispatch(current, result)).toBe(current);
    if (current.status === "ready") expect(current.dashboard.weeklyHours).toBe(5);
  });

  it("seeds from the pursuing title in mock mode and refuses when there is none", async () => {
    const seeded = await dispatchAction({
      source: "mock",
      load: { status: "empty" },
      retry: { kind: "seed-atlas", weeklyHours: null, horizonWeeks: null },
      pursuing: MOCK_PURSUING,
      now,
    });
    expect(seeded.ok).toBe(true);
    if (seeded.load.status === "ready") {
      expect(seeded.load.dashboard.goalTitle).toBe("Application development");
      expect(seeded.load.dashboard.goalSource).toBe("atlas_pursuing");
      expect(seeded.load.dashboard.tasks.every((task) => task.status === "todo")).toBe(true);
      expect(seeded.load.dashboard.skills.every((skill) => skill.progress === "unrated")).toBe(true);
    }
    const refused = await dispatchAction({
      source: "mock",
      load: { status: "empty" },
      retry: { kind: "seed-atlas", weeklyHours: null, horizonWeeks: null },
      pursuing: null,
      now,
    });
    expect(refused.ok).toBe(false);
    expect(refused.message).toBe(NO_PURSUING_MESSAGE);
    expect(loadAfterDispatch({ status: "empty" }, refused)).toEqual({ status: "empty" });
  });
});
