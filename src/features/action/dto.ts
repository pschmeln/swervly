/**
 * Client-safe Action wire contract for `/api/action/*` and Peter’s Action UI (#51).
 *
 * Aligned with `ActionPlanBundleJson` in PR #51 (`src/features/action-ui/types.ts`):
 * - Flat goal fields on the plan (`goalNodeId` / `goalLevel` / `goalTitle` / `goalSource`).
 * - Skill display field is `skillName` (DB column name).
 * - Timestamps are ISO-8601 strings; `dueOn` is `YYYY-MM-DD` or null.
 * - No Clerk ids, emails, or other users’ rows.
 *
 * Domain records in `types.ts` still use a nested `goal` for planning logic.
 * Account export (`exportActionData`) stays as DB row shapes for a faithful dump.
 *
 * Peter’s one-line swap after #50 lands:
 *   export type { ActionPlanBundleJson } from "@/features/action/dto";
 */

import type { ActionPlan, ActionSkillProgress, ActionTask } from "@/db/schema";
import type {
  EvidenceLevel,
  GoalLevel,
  GoalSource,
  SkillProgress,
  SkillScope,
  SkillSourceKind,
  TaskOrigin,
  TaskPhase,
  TaskStatus,
} from "@/features/action/types";

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

/** Alias for Peter’s UI swap point (`ActionPlanBundleJson`). */
export type ActionPlanBundleJson = ActionPlanBundleDto;
export type ActionPlanJson = ActionPlanDto;
export type ActionTaskJson = ActionTaskDto;
export type ActionSkillJson = ActionSkillDto;

function iso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function dueOnString(value: string | Date | null): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

/** Map a persisted plan row to the client wire DTO. */
export function toActionPlanDto(plan: ActionPlan): ActionPlanDto {
  return {
    id: plan.id,
    userId: plan.userId,
    goalNodeId: plan.goalNodeId,
    goalLevel: plan.goalLevel as GoalLevel,
    goalTitle: plan.goalTitle,
    goalSource: plan.goalSource as GoalSource,
    draftSource: plan.draftSource as ActionPlanDto["draftSource"],
    status: plan.status as ActionPlanDto["status"],
    weeklyHours: plan.weeklyHours,
    horizonWeeks: plan.horizonWeeks,
    createdAt: iso(plan.createdAt),
    updatedAt: iso(plan.updatedAt),
  };
}

/** Map a persisted task row to the client wire DTO. */
export function toActionTaskDto(task: ActionTask): ActionTaskDto {
  return {
    id: task.id,
    planId: task.planId,
    userId: task.userId,
    title: task.title,
    description: task.description,
    phase: task.phase as TaskPhase | null,
    status: task.status as TaskStatus,
    sortOrder: task.sortOrder,
    origin: task.origin as TaskOrigin,
    originKey: task.originKey,
    explanation: task.explanation,
    dueOn: dueOnString(task.dueOn),
    completedAt: task.completedAt ? iso(task.completedAt) : null,
    createdAt: iso(task.createdAt),
    updatedAt: iso(task.updatedAt),
  };
}

/** Map a persisted skill-progress row to the client wire DTO. */
export function toActionSkillDto(skill: ActionSkillProgress): ActionSkillDto {
  return {
    id: skill.id,
    planId: skill.planId,
    userId: skill.userId,
    skillName: skill.skillName,
    scope: skill.scope as SkillScope,
    evidence: skill.evidence as EvidenceLevel,
    skillSource: skill.skillSource as SkillSourceKind,
    progress: skill.progress as SkillProgress,
    originKey: skill.originKey,
    explanation: skill.explanation,
    createdAt: iso(skill.createdAt),
    updatedAt: iso(skill.updatedAt),
  };
}

/** Active-plan API payload: plan + tasks + skills. */
export function toActionPlanBundleDto(bundle: {
  plan: ActionPlan;
  tasks: ActionTask[];
  skills: ActionSkillProgress[];
}): ActionPlanBundleDto {
  return {
    plan: toActionPlanDto(bundle.plan),
    tasks: bundle.tasks.map(toActionTaskDto),
    skills: bundle.skills.map(toActionSkillDto),
  };
}

export const toActionPlanBundleJson = toActionPlanBundleDto;
