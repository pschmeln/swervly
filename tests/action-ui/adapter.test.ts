import { describe, expect, it } from "vitest";
import {
  changeToAtlasBody,
  changeToManualBody,
  seedFromAtlasBody,
  seedManualBody,
  settingsBody,
  toDashboard,
  updateTaskBody,
} from "@/features/action-ui/adapter";
import { bodyHasServerOwnedFields, loadAfterDispatch, requestFor } from "@/features/action-ui/api";
import { ACTION_LIMITS } from "@/features/action-ui/limits";
import { filledBundle } from "@/features/action-ui/mock";
import { ACTION_API } from "@/features/action-ui/paths";
import type { DashboardLoad, TaskPatch } from "@/features/action-ui/types";

describe("wire adapter", () => {
  it("reads the nested goal and skill name, and drops userId", () => {
    const bundle = filledBundle();
    bundle.plan.userId = "secret-user";
    bundle.tasks[0].userId = "secret-user";
    bundle.skills[0].userId = "secret-user";
    const view = toDashboard(bundle);
    expect(view?.goalTitle).toBe("Software Developers");
    expect(view?.goalLevel).toBe("occupation");
    expect(view?.goalSource).toBe("manual");
    expect(bundle.plan.goal.nodeId).toBe("occ:onet:15-1252.00");
    expect(bundle.plan.goal.onetCode).toBe("15-1252.00");
    expect(view?.skills.map((skill) => skill.name)).toContain("Programming");
    expect(view?.tasks[0].completedAt).toBeNull();
    expect(JSON.stringify(view)).not.toContain("secret-user");
    expect(JSON.stringify(bundle.skills[0])).toContain("\"name\":\"Programming\"");
    expect(JSON.stringify(bundle.plan.goal)).not.toContain("goalTitle");
  });

  it("rejects the old flat goal and skillName fields", () => {
    const bundle = filledBundle();
    const flat = { ...bundle.plan, goal: undefined } as unknown as typeof bundle.plan;
    expect(toDashboard({ ...bundle, plan: flat })).toBeNull();
    const skill = { ...bundle.skills[0], name: undefined } as unknown as (typeof bundle.skills)[0];
    expect(toDashboard({ ...bundle, skills: [skill] })).toBeNull();
  });

  it("returns null for an empty plan response and for a broken bundle", () => {
    expect(toDashboard(null)).toBeNull();
    const bundle = filledBundle();
    bundle.tasks[0].status = "later" as "todo";
    expect(toDashboard(bundle)).toBeNull();
  });

  it("keeps the previous dashboard when a dispatch result failed", () => {
    const current: DashboardLoad = { status: "ready", dashboard: toDashboard(filledBundle())! };
    expect(loadAfterDispatch(current, { ok: false, unavailable: false, message: "Could not save.", load: { status: "empty" }, recovered: null })).toBe(current);
    expect(loadAfterDispatch(current, { ok: false, unavailable: true, message: "down", load: { status: "unavailable" }, recovered: null }).status).toBe("unavailable");
  });
});

describe("request bodies", () => {
  const retries = [
    requestFor({ kind: "seed-atlas", weeklyHours: null, horizonWeeks: null }),
    requestFor({ kind: "seed-manual", nodeId: "occ:onet:15-1252.00", weeklyHours: 5, horizonWeeks: 8 }),
    requestFor({ kind: "change-goal-atlas", weeklyHours: null, horizonWeeks: null }),
    requestFor({ kind: "change-goal-manual", nodeId: "spec:application-development", weeklyHours: null, horizonWeeks: null }),
    requestFor({ kind: "settings", weeklyHours: null, horizonWeeks: 4 }),
    requestFor({ kind: "add-task", title: "Shadow someone", description: null, phase: "explore", dueOn: null }),
    requestFor({ kind: "update-task", id: "22222222-2222-4222-8222-222222222221", patch: { status: "done" } }),
    requestFor({ kind: "delete-task", id: "22222222-2222-4222-8222-222222222221" }),
    requestFor({ kind: "rate-skill", id: "33333333-3333-4333-8333-333333333331", progress: "learning" }),
  ];

  it("never sends explanation or origin", () => {
    for (const spec of retries) {
      expect(bodyHasServerOwnedFields(spec.body)).toBe(false);
      expect(JSON.stringify(spec.body ?? {})).not.toMatch(/"explanation"|"origin"/);
    }
  });

  it("seeds Atlas with mode only and always sends copySkillProgress false on a goal change", () => {
    expect(seedFromAtlasBody(null, null)).toEqual({ goal: { mode: "atlas_pursuing" } });
    expect(changeToAtlasBody(null, null)).toEqual({ goal: { mode: "atlas_pursuing" }, copySkillProgress: false });
    expect(seedManualBody("occ:onet:15-1252.00", 5, null)).toEqual({
      goal: { mode: "manual", nodeId: "occ:onet:15-1252.00" },
      weeklyHours: 5,
    });
    expect(changeToManualBody("spec:application-development", null, null)).toEqual({
      goal: { mode: "manual", nodeId: "spec:application-development" },
      copySkillProgress: false,
    });
    expect(settingsBody(null, 4)).toEqual({ weeklyHours: null, horizonWeeks: 4 });
    expect(requestFor({ kind: "reload" })).toEqual({ url: ACTION_API.plan, method: "GET" });
    expect(ACTION_API.revise).toBe("/api/action/plan/revise");
  });

  it("strips server-owned keys even if a patch is cast to include them", () => {
    const patch = { title: "Hi", explanation: "no", origin: "user" } as TaskPatch;
    expect(updateTaskBody(patch)).toEqual({ title: "Hi" });
  });

  it("mirrors the backend limits", () => {
    expect(ACTION_LIMITS).toEqual({
      maxTasksPerPlan: 40,
      maxSkillsPerPlan: 30,
      titleMax: 200,
      descriptionMax: 1000,
      weeklyHoursMin: 1,
      weeklyHoursMax: 40,
      horizonWeeksMin: 1,
      horizonWeeksMax: 52,
    });
  });
});
