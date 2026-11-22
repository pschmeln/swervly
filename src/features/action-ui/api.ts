import { ACTION_LIMITS, SKILL_PROGRESS, TASK_STATUSES } from "@/features/action/types";
import {
  addTaskBody,
  applyPlan,
  changeToAtlasBody,
  changeToManualBody,
  rateSkillBody,
  removeTask,
  seedFromAtlasBody,
  seedManualBody,
  settingsBody,
  toDashboard,
  toSkillView,
  toTaskView,
  updateTaskBody,
  upsertSkill,
  upsertTask,
} from "@/features/action-ui/adapter";
import { goalById } from "@/features/action-ui/catalog";
import { freshDashboard } from "@/features/action-ui/mock";
import { ACTION_API } from "@/features/action-ui/paths";
import type { ActionDataSource } from "@/features/action-ui/source";
import type {
  ActionPlanBundleDto,
  ActionPlanDto,
  ActionSkillDto,
  ActionTaskDto,
  DashboardLoad,
  DashboardView,
  PursuingDisplay,
  RetryAction,
  SkillProgress,
  TaskPatch,
  TaskStatus,
  TaskView,
} from "@/features/action-ui/types";
import { ACTION_UNAVAILABLE_MESSAGE, NOTHING_SAVED, NO_PURSUING_MESSAGE } from "@/features/action-ui/view";

export type ApiErrorBody = { code: string; message: string; fields?: Record<string, string> };

export type DispatchResult = {
  ok: boolean;
  unavailable: boolean;
  message: string;
  load: DashboardLoad;
  /** Set when a 409 means a plan already exists and a reload succeeded. */
  recovered: DashboardLoad | null;
};

type RequestSpec = { url: string; method: string; body?: unknown };

export function failureMessage(error: ApiErrorBody | null | undefined): string {
  const message = error?.message?.trim() ?? "";
  if (message.length > 0) return message;
  if (error?.fields) {
    for (const value of Object.values(error.fields)) {
      const field = value.trim();
      if (field.length > 0) return field;
    }
  }
  return NOTHING_SAVED;
}

/** The HTTP call for a retry. Bodies never include explanation or origin. */
export function requestFor(retry: RetryAction): RequestSpec {
  switch (retry.kind) {
    case "reload":
      return { url: ACTION_API.plan, method: "GET" };
    case "seed-atlas":
      return { url: ACTION_API.plan, method: "POST", body: seedFromAtlasBody(retry.weeklyHours, retry.horizonWeeks) };
    case "seed-manual":
      return { url: ACTION_API.plan, method: "POST", body: seedManualBody(retry.nodeId, retry.weeklyHours, retry.horizonWeeks) };
    case "change-goal-atlas":
      return { url: ACTION_API.plan, method: "PUT", body: changeToAtlasBody(retry.weeklyHours, retry.horizonWeeks) };
    case "change-goal-manual":
      return { url: ACTION_API.plan, method: "PUT", body: changeToManualBody(retry.nodeId, retry.weeklyHours, retry.horizonWeeks) };
    case "settings":
      return { url: ACTION_API.plan, method: "PATCH", body: settingsBody(retry.weeklyHours, retry.horizonWeeks) };
    case "add-task":
      return { url: ACTION_API.tasks, method: "POST", body: addTaskBody(retry) };
    case "update-task":
      return { url: ACTION_API.task(retry.id), method: "PATCH", body: updateTaskBody(retry.patch) };
    case "delete-task":
      return { url: ACTION_API.task(retry.id), method: "DELETE" };
    case "rate-skill":
      return { url: ACTION_API.skill(retry.id), method: "PATCH", body: rateSkillBody(retry.progress) };
  }
}

export function bodyHasServerOwnedFields(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const record = body as Record<string, unknown>;
  return "explanation" in record || "origin" in record;
}

type Parsed =
  | { ok: true; data: unknown }
  | { ok: false; unavailable: boolean; error: ApiErrorBody };

async function readBody(response: Response): Promise<Parsed> {
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    return {
      ok: false,
      unavailable: response.status === 503,
      error: { code: response.status === 503 ? "action_unavailable" : "invalid_response", message: response.status === 503 ? ACTION_UNAVAILABLE_MESSAGE : NOTHING_SAVED },
    };
  }
  if (json && typeof json === "object" && "ok" in json && (json as { ok: unknown }).ok === true && "data" in json) {
    return { ok: true, data: (json as { data: unknown }).data };
  }
  const error = json && typeof json === "object" && "error" in json ? (json as { error: ApiErrorBody }).error : undefined;
  const code = error?.code ?? (response.status === 503 ? "action_unavailable" : "unknown_error");
  return {
    ok: false,
    unavailable: response.status === 503 || code === "action_unavailable",
    error: { code, message: error?.message ?? (response.status === 503 ? ACTION_UNAVAILABLE_MESSAGE : NOTHING_SAVED), fields: error?.fields },
  };
}

function ready(dashboard: DashboardView): DashboardLoad {
  return { status: "ready", dashboard };
}

function fail(load: DashboardLoad, message: string, unavailable = false): DispatchResult {
  return { ok: false, unavailable, message, load: unavailable ? { status: "unavailable" } : load, recovered: null };
}

function succeed(load: DashboardLoad): DispatchResult {
  return { ok: true, unavailable: false, message: "", load, recovered: null };
}

function applySuccess(load: DashboardLoad, retry: RetryAction, data: unknown): DispatchResult {
  if (retry.kind === "reload" || retry.kind === "seed-atlas" || retry.kind === "seed-manual" || retry.kind === "change-goal-atlas" || retry.kind === "change-goal-manual") {
    if (data == null) return succeed({ status: "empty" });
    const dashboard = toDashboard(data as ActionPlanBundleDto);
    return dashboard ? succeed(ready(dashboard)) : fail(load, NOTHING_SAVED);
  }
  if (load.status !== "ready") return fail(load, NOTHING_SAVED);
  const dashboard = load.dashboard;
  if (retry.kind === "settings") {
    const plan = data && typeof data === "object" && "plan" in data ? (data as { plan: ActionPlanDto }).plan : null;
    const next = plan ? applyPlan(dashboard, plan) : null;
    return next ? succeed(ready(next)) : fail(load, NOTHING_SAVED);
  }
  if (retry.kind === "add-task" || retry.kind === "update-task") {
    const raw = data && typeof data === "object" && "task" in data ? (data as { task: ActionTaskDto }).task : null;
    const task = raw ? toTaskView(raw) : null;
    return task ? succeed(ready(upsertTask(dashboard, task))) : fail(load, NOTHING_SAVED);
  }
  if (retry.kind === "delete-task") {
    const deleted = data && typeof data === "object" && "deleted" in data && (data as { deleted: unknown }).deleted === true;
    return deleted ? succeed(ready(removeTask(dashboard, retry.id))) : fail(load, NOTHING_SAVED);
  }
  const raw = data && typeof data === "object" && "skill" in data ? (data as { skill: ActionSkillDto }).skill : null;
  const skill = raw ? toSkillView(raw) : null;
  if (!skill || skill.id !== retry.id) return fail(load, NOTHING_SAVED);
  return succeed(ready(upsertSkill(dashboard, skill)));
}

async function callApi(retry: RetryAction, load: DashboardLoad, fetchImpl: typeof fetch): Promise<DispatchResult> {
  const spec = requestFor(retry);
  let response: Response;
  try {
    response = await fetchImpl(spec.url, {
      method: spec.method,
      headers: spec.body ? { "content-type": "application/json" } : undefined,
      body: spec.body ? JSON.stringify(spec.body) : undefined,
    });
  } catch {
    return fail(load, NOTHING_SAVED);
  }
  const parsed = await readBody(response);
  if (!parsed.ok) {
    if (parsed.unavailable) return fail(load, failureMessage(parsed.error), true);
    if (parsed.error.code === "plan_exists") {
      const again = await callApi({ kind: "reload" }, load, fetchImpl);
      if (again.ok) {
        return { ok: false, unavailable: false, message: failureMessage(parsed.error), load: again.load, recovered: again.load };
      }
    }
    return fail(load, failureMessage(parsed.error));
  }
  return applySuccess(load, retry, parsed.data);
}

function mockStatus(task: TaskView, status: TaskStatus, now: Date): TaskView {
  if (status === "done" && task.status !== "done") return { ...task, status, completedAt: now.toISOString() };
  if (status !== "done") return { ...task, status, completedAt: null };
  return { ...task, status };
}

function mockPatch(task: TaskView, patch: TaskPatch, now: Date): TaskView {
  const next = { ...task };
  if (patch.title !== undefined) next.title = patch.title;
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.phase !== undefined) next.phase = patch.phase;
  if (patch.dueOn !== undefined) next.dueOn = patch.dueOn;
  if (patch.status !== undefined) return mockStatus({ ...next, status: task.status }, patch.status, now);
  return next;
}

function settingsOf(retry: RetryAction): { weeklyHours: number | null; horizonWeeks: number | null } {
  if (retry.kind === "reload" || retry.kind === "delete-task" || retry.kind === "rate-skill" || retry.kind === "add-task" || retry.kind === "update-task") {
    return { weeklyHours: null, horizonWeeks: null };
  }
  return { weeklyHours: retry.weeklyHours, horizonWeeks: retry.horizonWeeks };
}

function mockDispatch(load: DashboardLoad, retry: RetryAction, pursuing: PursuingDisplay | null, now: Date): DispatchResult {
  if (retry.kind === "reload") {
    if (load.status === "unavailable") return fail(load, ACTION_UNAVAILABLE_MESSAGE, true);
    return succeed(load.status === "loading" ? { status: "empty" } : load);
  }
  if (load.status === "unavailable") return fail(load, ACTION_UNAVAILABLE_MESSAGE, true);

  if (retry.kind === "seed-atlas" || retry.kind === "change-goal-atlas") {
    if (!pursuing) return fail(load, NO_PURSUING_MESSAGE);
    const settings = settingsOf(retry);
    return succeed(ready(freshDashboard({ title: pursuing.title, level: pursuing.level, source: "atlas_pursuing", ...settings }, now)));
  }
  if (retry.kind === "seed-manual" || retry.kind === "change-goal-manual") {
    const goal = goalById(retry.nodeId);
    if (!goal) return fail(load, "That career is not in the map.");
    const settings = settingsOf(retry);
    return succeed(ready(freshDashboard({ title: goal.title, level: goal.level, source: "manual", ...settings }, now)));
  }
  if (load.status !== "ready") return fail(load, "No active plan.");
  const dashboard = load.dashboard;

  if (retry.kind === "settings") {
    return succeed(ready({ ...dashboard, weeklyHours: retry.weeklyHours, horizonWeeks: retry.horizonWeeks }));
  }
  if (retry.kind === "add-task") {
    if (dashboard.tasks.length >= ACTION_LIMITS.maxTasksPerPlan) {
      return fail(load, `A plan can have at most ${ACTION_LIMITS.maxTasksPerPlan} tasks.`);
    }
    const sortOrder = dashboard.tasks.reduce((max, task) => Math.max(max, task.sortOrder), -1) + 1;
    const task: TaskView = {
      id: `44444444-4444-4444-8444-${String(dashboard.tasks.length + 1).padStart(12, "0")}`,
      title: retry.title,
      description: retry.description,
      phase: retry.phase,
      status: "todo",
      sortOrder,
      origin: "user",
      originKey: null,
      explanation: "Added by you.",
      dueOn: retry.dueOn,
      completedAt: null,
    };
    return succeed(ready(upsertTask(dashboard, task)));
  }
  if (retry.kind === "update-task") {
    const existing = dashboard.tasks.find((task) => task.id === retry.id);
    if (!existing) return fail(load, "Task not found.");
    return succeed(ready(upsertTask(dashboard, mockPatch(existing, retry.patch, now))));
  }
  if (retry.kind === "delete-task") {
    if (!dashboard.tasks.some((task) => task.id === retry.id)) return fail(load, "Task not found.");
    return succeed(ready(removeTask(dashboard, retry.id)));
  }
  const skill = dashboard.skills.find((item) => item.id === retry.id);
  if (!skill) return fail(load, "Skill progress not found.");
  if (skill.evidence === "unknown") return fail(load, "This note is missing career data, not a skill to rate.");
  return succeed(ready(upsertSkill(dashboard, { ...skill, progress: retry.progress })));
}

export async function dispatchAction(input: {
  source: ActionDataSource;
  load: DashboardLoad;
  retry: RetryAction;
  pursuing: PursuingDisplay | null;
  now?: Date;
  fetchImpl?: typeof fetch;
}): Promise<DispatchResult> {
  const now = input.now ?? new Date();
  if (input.source === "mock") return mockDispatch(input.load, input.retry, input.pursuing, now);
  return callApi(input.retry, input.load, input.fetchImpl ?? fetch);
}

/** Saved values change only after a successful result. A failure keeps the previous load. */
export function loadAfterDispatch(current: DashboardLoad, result: DispatchResult): DashboardLoad {
  if (result.ok) return result.load;
  if (result.unavailable) return { status: "unavailable" };
  if (result.recovered) return result.recovered;
  return current;
}

export function isSkillProgress(value: string): value is SkillProgress {
  return SKILL_PROGRESS.some((item) => item === value);
}

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.some((item) => item === value);
}
