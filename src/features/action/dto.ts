/**
 * Client-safe Action DTO contract for API responses and Peter’s UI.
 *
 * Wire format rules:
 * - Nested `goal` object (never flat goalNodeId/goalLevel on the client).
 * - Timestamps are ISO-8601 strings; `dueOn` is `YYYY-MM-DD` or null.
 * - Skill display name is `name` (DB column is skill_name).
 * - No Clerk ids, emails, or other users’ rows.
 *
 * Account export (`exportActionData`) stays as DB row shapes for a faithful dump;
 * UI and `/api/action/*` use these DTOs.
 */

import type { ActionPlan, ActionSkillProgress, ActionTask } from "@/db/schema";
import type {
  ActionGoal,
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
  goal: ActionGoal;
  status: "active" | "archived";
  draftSource: "template_v1";
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
  origin: TaskOrigin;
  originKey: string | null;
  explanation: string;
  sortOrder: number;
  dueOn: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ActionSkillDto = {
  id: string;
  planId: string;
  userId: string;
  name: string;
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

function iso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  return new Date(value).toISOString();
}

function dueOnString(value: string | Date | null): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function goalFromPlan(plan: ActionPlan): ActionGoal {
  return {
    nodeId: plan.goalNodeId as ActionGoal["nodeId"],
    level: plan.goalLevel as GoalLevel,
    title: plan.goalTitle,
    onetCode: plan.goalLevel === "occupation" ? plan.goalNodeId.replace(/^occ:onet:/, "") : null,
    source: plan.goalSource as GoalSource,
  };
}

/** Map a persisted plan row to the client DTO. */
export function toActionPlanDto(plan: ActionPlan): ActionPlanDto {
  return {
    id: plan.id,
    userId: plan.userId,
    goal: goalFromPlan(plan),
    status: plan.status as ActionPlanDto["status"],
    draftSource: plan.draftSource as ActionPlanDto["draftSource"],
    weeklyHours: plan.weeklyHours,
    horizonWeeks: plan.horizonWeeks,
    createdAt: iso(plan.createdAt),
    updatedAt: iso(plan.updatedAt),
  };
}

/** Map a persisted task row to the client DTO. */
export function toActionTaskDto(task: ActionTask): ActionTaskDto {
  return {
    id: task.id,
    planId: task.planId,
    userId: task.userId,
    title: task.title,
    description: task.description,
    phase: task.phase as TaskPhase | null,
    status: task.status as TaskStatus,
    origin: task.origin as TaskOrigin,
    originKey: task.originKey,
    explanation: task.explanation,
    sortOrder: task.sortOrder,
    dueOn: dueOnString(task.dueOn),
    completedAt: task.completedAt ? iso(task.completedAt) : null,
    createdAt: iso(task.createdAt),
    updatedAt: iso(task.updatedAt),
  };
}

/** Map a persisted skill-progress row to the client DTO. */
export function toActionSkillDto(skill: ActionSkillProgress): ActionSkillDto {
  return {
    id: skill.id,
    planId: skill.planId,
    userId: skill.userId,
    name: skill.skillName,
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
