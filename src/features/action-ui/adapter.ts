import { ACTION_LIMITS } from "@/features/action-ui/limits";
import type {
  ActionPlanBundleDto,
  ActionPlanDto,
  ActionSkillDto,
  ActionTaskDto,
  DashboardView,
  EvidenceLevel,
  GoalLevel,
  GoalSource,
  SkillProgress,
  SkillScope,
  SkillView,
  TaskOrigin,
  TaskPatch,
  TaskPhase,
  TaskStatus,
  TaskView,
} from "@/features/action-ui/types";

const GOAL_NODE_ID = /^((spec):[a-z0-9-]+|occ:onet:[0-9]{2}-[0-9]{4}[.][0-9]{2})$/;

const GOAL_LEVELS = new Set<string>(["specialization", "occupation"]);
const GOAL_SOURCES = new Set<string>(["atlas_pursuing", "manual"]);
const TASK_STATUSES = new Set<string>(["todo", "doing", "done"]);
const TASK_ORIGINS = new Set<string>(["template", "user", "preserved"]);
const TASK_PHASES = new Set<string>(["practice", "prepare", "explore", "reflect"]);
const SKILL_PROGRESS = new Set<string>(["unrated", "learning", "comfortable"]);
const SKILL_SCOPES = new Set<string>(["shared", "occupation_specific", "optional_exploration"]);
const EVIDENCE = new Set<string>(["known", "suggested", "unknown"]);

export function isGoalNodeId(value: string): boolean {
  return GOAL_NODE_ID.test(value);
}

export function asIso(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const instant = new Date(value);
    return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
  }
  return null;
}

export function asDue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function asInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function asText(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

export function toTaskView(raw: ActionTaskDto): TaskView | null {
  const title = asText(raw.title);
  const status = asText(raw.status);
  const origin = asText(raw.origin);
  const id = asText(raw.id);
  if (!title || !id || !status || !TASK_STATUSES.has(status) || !origin || !TASK_ORIGINS.has(origin)) return null;
  const phase = raw.phase == null ? null : asText(raw.phase);
  if (phase != null && !TASK_PHASES.has(phase)) return null;
  return {
    id,
    title,
    description: raw.description == null ? null : asText(raw.description),
    phase: phase as TaskPhase | null,
    status: status as TaskStatus,
    sortOrder: asInt(raw.sortOrder) ?? 0,
    origin: origin as TaskOrigin,
    originKey: raw.originKey == null ? null : asText(raw.originKey),
    explanation: asText(raw.explanation) ?? "",
    dueOn: asDue(raw.dueOn),
    completedAt: raw.completedAt == null ? null : asIso(raw.completedAt),
  };
}

export function toSkillView(raw: ActionSkillDto): SkillView | null {
  const id = asText(raw.id);
  const name = asText(raw.name);
  const scope = asText(raw.scope);
  const evidence = asText(raw.evidence);
  const progress = asText(raw.progress);
  const skillSource = asText(raw.skillSource);
  if (!id || !name || !scope || !SKILL_SCOPES.has(scope) || !evidence || !EVIDENCE.has(evidence)) return null;
  if (!progress || !SKILL_PROGRESS.has(progress)) return null;
  if (skillSource !== "onet" && skillSource !== "editorial") return null;
  return {
    id,
    name,
    scope: scope as SkillScope,
    evidence: evidence as EvidenceLevel,
    skillSource,
    progress: progress as SkillProgress,
    originKey: asText(raw.originKey) ?? "",
    explanation: asText(raw.explanation) ?? "",
  };
}

/** Drop userId and normalize dates. Returns null when the bundle is not a plan. */
export function toDashboard(bundle: ActionPlanBundleDto | null | undefined): DashboardView | null {
  if (!bundle || typeof bundle !== "object" || !bundle.plan?.goal) return null;
  const plan = bundle.plan;
  const goal = plan.goal;
  const level = asText(goal.level);
  const source = asText(goal.source);
  const title = asText(goal.title);
  const nodeId = asText(goal.nodeId);
  const id = asText(plan.id);
  if (!id || !title || !nodeId || !level || !GOAL_LEVELS.has(level) || !source || !GOAL_SOURCES.has(source)) return null;
  if (goal.onetCode != null && typeof goal.onetCode !== "string") return null;
  if (!Array.isArray(bundle.tasks) || !Array.isArray(bundle.skills)) return null;
  const tasks = bundle.tasks.map((task) => toTaskView(task)).filter((task): task is TaskView => task != null);
  const skills = bundle.skills.map((skill) => toSkillView(skill)).filter((skill): skill is SkillView => skill != null);
  if (tasks.length !== bundle.tasks.length || skills.length !== bundle.skills.length) return null;
  return {
    planId: id,
    goalTitle: title,
    goalLevel: level as GoalLevel,
    goalSource: source as GoalSource,
    weeklyHours: plan.weeklyHours == null ? null : asInt(plan.weeklyHours),
    horizonWeeks: plan.horizonWeeks == null ? null : asInt(plan.horizonWeeks),
    tasks: [...tasks].sort((a, b) => a.sortOrder - b.sortOrder),
    skills,
  };
}

export function upsertTask(dashboard: DashboardView, task: TaskView): DashboardView {
  const exists = dashboard.tasks.some((item) => item.id === task.id);
  const tasks = exists
    ? dashboard.tasks.map((item) => (item.id === task.id ? task : item))
    : [...dashboard.tasks, task];
  return { ...dashboard, tasks: tasks.sort((a, b) => a.sortOrder - b.sortOrder) };
}

export function removeTask(dashboard: DashboardView, taskId: string): DashboardView {
  return { ...dashboard, tasks: dashboard.tasks.filter((task) => task.id !== taskId) };
}

export function upsertSkill(dashboard: DashboardView, skill: SkillView): DashboardView {
  return {
    ...dashboard,
    skills: dashboard.skills.map((item) => (item.id === skill.id ? skill : item)),
  };
}

export function applyPlan(dashboard: DashboardView, plan: ActionPlanDto): DashboardView | null {
  const next = toDashboard({ plan, tasks: [], skills: [] });
  if (!next) return null;
  return {
    ...dashboard,
    planId: next.planId,
    goalTitle: next.goalTitle,
    goalLevel: next.goalLevel,
    goalSource: next.goalSource,
    weeklyHours: next.weeklyHours,
    horizonWeeks: next.horizonWeeks,
  };
}

type Settings = { weeklyHours: number | null; horizonWeeks: number | null };

function settingsFields(settings: Settings): Partial<Settings> {
  return {
    ...(settings.weeklyHours != null ? { weeklyHours: settings.weeklyHours } : {}),
    ...(settings.horizonWeeks != null ? { horizonWeeks: settings.horizonWeeks } : {}),
  };
}

/** Atlas seed: mode only. The server reads the saved pursuing mark. */
export function seedFromAtlasBody(weeklyHours: number | null, horizonWeeks: number | null) {
  return { goal: { mode: "atlas_pursuing" as const }, ...settingsFields({ weeklyHours, horizonWeeks }) };
}

export function seedManualBody(nodeId: string, weeklyHours: number | null, horizonWeeks: number | null) {
  return { goal: { mode: "manual" as const, nodeId }, ...settingsFields({ weeklyHours, horizonWeeks }) };
}

export function changeToAtlasBody(weeklyHours: number | null, horizonWeeks: number | null) {
  return { ...seedFromAtlasBody(weeklyHours, horizonWeeks), copySkillProgress: false as const };
}

export function changeToManualBody(nodeId: string, weeklyHours: number | null, horizonWeeks: number | null) {
  return { ...seedManualBody(nodeId, weeklyHours, horizonWeeks), copySkillProgress: false as const };
}

/** PATCH sends null so a cleared field is stored as null. */
export function settingsBody(weeklyHours: number | null, horizonWeeks: number | null) {
  return { weeklyHours, horizonWeeks };
}

/** explanation and origin are server-owned and are not copied onto the body. */
export function updateTaskBody(patch: TaskPatch): TaskPatch {
  const body: TaskPatch = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.phase !== undefined) body.phase = patch.phase;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.dueOn !== undefined) body.dueOn = patch.dueOn;
  return body;
}

export function addTaskBody(input: { title: string; description: string | null; phase: TaskPhase | null; dueOn: string | null }) {
  return {
    title: input.title,
    description: input.description,
    phase: input.phase,
    dueOn: input.dueOn,
  };
}

export function rateSkillBody(progress: SkillProgress) {
  return { progress };
}

export type FieldErrors = { hours?: string; weeks?: string; title?: string; description?: string; dueOn?: string };

export function parseWholeNumber(raw: string, min: number, max: number, label: string): { ok: true; value: number | null } | { ok: false; message: string } {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (!/^\d+$/.test(trimmed)) return { ok: false, message: `Use a whole number for ${label}, or leave it blank.` };
  const value = Number(trimmed);
  if (value < min || value > max) return { ok: false, message: `${label} must be between ${min} and ${max}.` };
  return { ok: true, value };
}

export function parseSettings(hoursRaw: string, weeksRaw: string): { ok: true; weeklyHours: number | null; horizonWeeks: number | null } | { ok: false; message: string } {
  const hours = parseWholeNumber(hoursRaw, ACTION_LIMITS.weeklyHoursMin, ACTION_LIMITS.weeklyHoursMax, "Weekly hours");
  if (!hours.ok) return hours;
  const weeks = parseWholeNumber(weeksRaw, ACTION_LIMITS.horizonWeeksMin, ACTION_LIMITS.horizonWeeksMax, "Horizon");
  if (!weeks.ok) return weeks;
  return { ok: true, weeklyHours: hours.value, horizonWeeks: weeks.value };
}

export function parseTaskDraft(input: { title: string; description: string; dueOn: string }): { ok: true; title: string; description: string | null; dueOn: string | null } | { ok: false; message: string } {
  const title = input.title.trim();
  if (title.length === 0) return { ok: false, message: "Add a title for this step." };
  if (title.length > ACTION_LIMITS.titleMax) return { ok: false, message: `Titles can be ${ACTION_LIMITS.titleMax} characters at most.` };
  const description = input.description.trim();
  if (description.length > ACTION_LIMITS.descriptionMax) {
    return { ok: false, message: `Descriptions can be ${ACTION_LIMITS.descriptionMax} characters at most.` };
  }
  const dueOn = input.dueOn.trim();
  if (dueOn.length > 0 && !/^\d{4}-\d{2}-\d{2}$/.test(dueOn)) return { ok: false, message: "Use a due date as YYYY-MM-DD, or leave it blank." };
  return { ok: true, title, description: description.length > 0 ? description : null, dueOn: dueOn.length > 0 ? dueOn : null };
}
