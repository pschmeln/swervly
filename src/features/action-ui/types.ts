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

/** Client-safe Action wire types from main (PR #50). */
export type { ActionPlanBundleJson } from "@/features/action/wire";
export type {
  ActionPlanBundleDto,
  ActionPlanDto,
  ActionPlanJson,
  ActionSkillDto,
  ActionSkillJson,
  ActionTaskDto,
  ActionTaskJson,
} from "@/features/action/wire";

export type {
  EvidenceLevel,
  GoalLevel,
  GoalSource,
  SkillProgress,
  SkillScope,
  SkillSourceKind,
  TaskOrigin,
  TaskPhase,
  TaskStatus,
};

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
  skillSource: SkillSourceKind;
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
