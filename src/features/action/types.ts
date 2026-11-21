/**
 * Action domain types (Stage B). Pure data shapes — no database, no UI, no AI.
 * Persistence lands only after the schema proposal is approved.
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
 * Self-rated progress. Absence of a row (or `unrated`) means the student has
 * not said anything yet — never "you lack this skill."
 */
export const SKILL_PROGRESS = ["unrated", "learning", "comfortable"] as const;
export type SkillProgress = (typeof SKILL_PROGRESS)[number];

/**
 * How a skill relates to the goal. Never treat every child occupation skill as required.
 */
export const SKILL_SCOPES = ["shared", "occupation_specific", "optional_exploration"] as const;
export type SkillScope = (typeof SKILL_SCOPES)[number];

/**
 * How strong the evidence is for classifying the skill.
 * - known: enough occupations (or a single occupation goal) to classify
 * - suggested: thin evidence; UI must say it is a suggestion
 * - unknown: cannot classify; UI must say evidence is insufficient
 */
export const EVIDENCE_LEVELS = ["known", "suggested", "unknown"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export type SkillSourceKind = "onet" | "editorial";

export type SkillTarget = {
  name: string;
  scope: SkillScope;
  evidence: EvidenceLevel;
  skillSource: SkillSourceKind;
  /** Stable key for idempotent seed/refresh. */
  originKey: string;
  /** Plain-language why this skill appears. Always required. */
  explanation: string;
  /** Occupation titles that list this skill, when relevant. */
  appearsIn: readonly string[];
};

export type TaskDraft = {
  title: string;
  origin: TaskOrigin;
  originKey: string;
  /** Plain-language why this task appears. Always required. */
  explanation: string;
  status: TaskStatus;
};

export type PlanDraft = {
  source: "template_v1";
  goal: ActionGoal;
  skills: SkillTarget[];
  tasks: TaskDraft[];
};

/** In-memory plan row shape used by domain helpers until persistence exists. */
export type ActionPlanRecord = {
  id: string;
  userId: string;
  goal: ActionGoal;
  status: "active" | "archived";
  draftSource: PlanDraft["source"];
};

export type ActionTaskRecord = {
  id: string;
  planId: string;
  userId: string;
  title: string;
  status: TaskStatus;
  origin: TaskOrigin;
  originKey: string | null;
  explanation: string;
  sortOrder: number;
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

/** Levels that are never Action goals. */
export function isGoalLevel(level: AtlasLevel): level is GoalLevel {
  return level === "specialization" || level === "occupation";
}
