/**
 * Mirror of the client-safe Action wire DTOs in src/features/action/dto.ts at
 * PR #50 commit 4995fab (dto.ts@4995fab). Flat goal fields. Skill field is
 * skillName. Timestamps are ISO-8601 strings. dueOn is YYYY-MM-DD or null.
 *
 * TODO: once PR #50 merges, delete the local DTO declarations below and replace
 * them with:
 * export type { ActionPlanBundleJson } from "@/features/action/dto";
 */

export const GOAL_LEVELS = ["specialization", "occupation"] as const;
export type GoalLevel = (typeof GOAL_LEVELS)[number];

export const GOAL_SOURCES = ["atlas_pursuing", "manual"] as const;
export type GoalSource = (typeof GOAL_SOURCES)[number];

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_ORIGINS = ["template", "user", "preserved"] as const;
export type TaskOrigin = (typeof TASK_ORIGINS)[number];

export const TASK_PHASES = ["practice", "prepare", "explore", "reflect"] as const;
export type TaskPhase = (typeof TASK_PHASES)[number];

export const SKILL_PROGRESS = ["unrated", "learning", "comfortable"] as const;
export type SkillProgress = (typeof SKILL_PROGRESS)[number];

export const SKILL_SCOPES = ["shared", "occupation_specific", "optional_exploration"] as const;
export type SkillScope = (typeof SKILL_SCOPES)[number];

export const EVIDENCE_LEVELS = ["known", "suggested", "unknown"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export type SkillSourceKind = "onet" | "editorial";

export type ActionPlanDto = {
  id: string;
  userId: string;
  goalNodeId: string;
  goalLevel: GoalLevel;
  goalTitle: string;
  goalSource: GoalSource;
  draftSource: "template_v1";
  status: "active" | "archived";
  weeklyHours: number | null;
  horizonWeeks: number | null;
  createdAt: string;
  updatedAt: string;
};

export type ActionTaskDto = {
  id: string;
  planId: string;
  userId: string;
  title: string;
  description: string | null;
  phase: TaskPhase | null;
  status: TaskStatus;
  sortOrder: number;
  origin: TaskOrigin;
  originKey: string | null;
  explanation: string;
  dueOn: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActionSkillDto = {
  id: string;
  planId: string;
  userId: string;
  skillName: string;
  scope: SkillScope;
  evidence: EvidenceLevel;
  skillSource: SkillSourceKind;
  progress: SkillProgress;
  originKey: string;
  explanation: string;
  createdAt: string;
  updatedAt: string;
};

export type ActionPlanBundleDto = {
  plan: ActionPlanDto;
  tasks: ActionTaskDto[];
  skills: ActionSkillDto[];
};

/** Aliases matching dto.ts@4995fab so the swap is one import line. */
export type ActionPlanBundleJson = ActionPlanBundleDto;
export type ActionPlanJson = ActionPlanDto;
export type ActionTaskJson = ActionTaskDto;
export type ActionSkillJson = ActionSkillDto;

/** Career the student marked as pursuing on the career map. The id stays on the server. */
export type PursuingDisplay = {
  title: string;
  level: GoalLevel;
};

export type TaskView = {
  id: string;
  title: string;
  description: string | null;
  phase: TaskPhase | null;
  status: TaskStatus;
  sortOrder: number;
  origin: TaskOrigin;
  originKey: string | null;
  explanation: string;
  dueOn: string | null;
  completedAt: string | null;
};

export type SkillView = {
  id: string;
  name: string;
  scope: SkillScope;
  evidence: EvidenceLevel;
  skillSource: "onet" | "editorial";
  progress: SkillProgress;
  originKey: string;
  explanation: string;
};

export type DashboardView = {
  planId: string;
  goalTitle: string;
  goalLevel: GoalLevel;
  goalSource: GoalSource;
  weeklyHours: number | null;
  horizonWeeks: number | null;
  tasks: TaskView[];
  skills: SkillView[];
};

export type DashboardLoad =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; dashboard: DashboardView };

export type TaskPatch = {
  title?: string;
  description?: string | null;
  phase?: TaskPhase | null;
  status?: TaskStatus;
  dueOn?: string | null;
};

export type RetryAction =
  | { kind: "reload" }
  | { kind: "seed-atlas"; weeklyHours: number | null; horizonWeeks: number | null }
  | { kind: "seed-manual"; nodeId: string; weeklyHours: number | null; horizonWeeks: number | null }
  | { kind: "change-goal-atlas"; weeklyHours: number | null; horizonWeeks: number | null }
  | { kind: "change-goal-manual"; nodeId: string; weeklyHours: number | null; horizonWeeks: number | null }
  | { kind: "settings"; weeklyHours: number | null; horizonWeeks: number | null }
  | { kind: "add-task"; title: string; description: string | null; phase: TaskPhase | null; dueOn: string | null }
  | { kind: "update-task"; id: string; patch: TaskPatch }
  | { kind: "delete-task"; id: string }
  | { kind: "rate-skill"; id: string; progress: SkillProgress };

export type SaveNotice =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string; retry: RetryAction };

export type GoalOption = {
  nodeId: string;
  title: string;
  level: GoalLevel;
};
