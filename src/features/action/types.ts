/**
 * Action domain types. Pure data shapes shared by templates, APIs, and persistence.
 * No AI. Missing / unrated skill progress never means the student lacks the skill.
 */

import type { AtlasLevel, AtlasNodeId } from "@/features/atlas/types";

/** How the student locked the career goal for this plan. */
export const GOAL_SOURCES = ["atlas_pursuing", "manual"] as const;
export type GoalSource = (typeof GOAL_SOURCES)[number];

/** Only specialization and occupation are valid Action goals (same as Atlas pursuing). */
export const GOAL_LEVELS = ["specialization", "occupation"] as const;
export type GoalLevel = (typeof GOAL_LEVELS)[number];

export type ActionGoal = {
  nodeId: AtlasNodeId;
  level: GoalLevel;
  title: string;
  /** Present when level is occupation. */
  onetCode: string | null;
  source: GoalSource;
};

export const TASK_STATUSES = ["todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_ORIGINS = ["template", "user", "preserved"] as const;
export type TaskOrigin = (typeof TASK_ORIGINS)[number];

/**
 * Roadmap phase on a task (no separate milestones table).
 * Template seeds use these; students may leave phase null.
 */
export const TASK_PHASES = ["practice", "prepare", "explore", "reflect"] as const;
export type TaskPhase = (typeof TASK_PHASES)[number];

/**
 * Self-rated progress. Absence of a row (or `unrated`) means the student has
 * not said anything yet — never "you lack this skill."
 */
export const SKILL_PROGRESS = ["unrated", "learning", "comfortable"] as const;
export type SkillProgress = (typeof SKILL_PROGRESS)[number];

export const SKILL_SCOPES = ["shared", "occupation_specific", "optional_exploration"] as const;
export type SkillScope = (typeof SKILL_SCOPES)[number];

export const EVIDENCE_LEVELS = ["known", "suggested", "unknown"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export type SkillSourceKind = "onet" | "editorial";

/** Soft product limits enforced in the app (documented; CHECKs optional in SQL). */
export const ACTION_LIMITS = {
  maxTasksPerPlan: 40,
  maxSkillsPerPlan: 30,
  titleMax: 200,
  descriptionMax: 1000,
  weeklyHoursMin: 1,
  weeklyHoursMax: 40,
  horizonWeeksMin: 1,
  horizonWeeksMax: 52,
} as const;

export type SkillTarget = {
  name: string;
  scope: SkillScope;
  evidence: EvidenceLevel;
  skillSource: SkillSourceKind;
  originKey: string;
  explanation: string;
  appearsIn: readonly string[];
};

export type TaskDraft = {
  title: string;
  description: string | null;
  phase: TaskPhase | null;
  origin: TaskOrigin;
  originKey: string;
  explanation: string;
  status: TaskStatus;
  /** ISO date YYYY-MM-DD when set by templates (usually null). */
  dueOn: string | null;
};

export type PlanDraft = {
  source: "template_v1";
  goal: ActionGoal;
  skills: SkillTarget[];
  tasks: TaskDraft[];
};

export type ActionPlanRecord = {
  id: string;
  userId: string;
  goal: ActionGoal;
  status: "active" | "archived";
  draftSource: PlanDraft["source"];
  weeklyHours: number | null;
  horizonWeeks: number | null;
};

export type ActionTaskRecord = {
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
};

export type ActionSkillRecord = {
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
};

export function isGoalLevel(level: AtlasLevel): level is GoalLevel {
  return level === "specialization" || level === "occupation";
}
