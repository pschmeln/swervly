export { ActionAuthzError, allOwned, filterOwned, requireOwned } from "@/features/action/authz";
export { isMissingActionRelation, isUniqueViolation } from "@/features/action/db-errors";
export { analyzeSkillTargets, openSkillTargets, progressLabel, MIN_OCCUPATIONS_FOR_SHARED } from "@/features/action/gap-analysis";
export { isValidActionGoalId, resolveActionGoal, type ResolveActionGoalContext } from "@/features/action/goal";
export { reviseActivePlanSeed, seedAfterGoalChange } from "@/features/action/plan-change";
export {
  defaultPlanningService,
  TemplatePlanningService,
  type PlanningContext,
  type PlanningService,
} from "@/features/action/planning-service";
export {
  AddTaskInput,
  AtlasGoalNodeId,
  ChangeGoalInput,
  ResolveGoalInput,
  SeedPlanInput,
  UpdatePlanInput,
  UpdateSkillProgressInput,
  UpdateTaskInput,
} from "@/features/action/schemas";
export {
  addTask,
  changePlanGoal,
  deleteTask,
  exportActionData,
  getActivePlan,
  getOwnedPlan,
  resolveGoalFromInput,
  reviseActivePlan,
  seedActivePlan,
  updateActivePlan,
  updateSkillProgress,
  updateTask,
} from "@/features/action/server";
export { EDITORIAL_TASKS, TEMPLATE_VERSION, templateTasks } from "@/features/action/templates";
export type {
  ActionGoal,
  ActionPlanRecord,
  ActionSkillRecord,
  ActionTaskRecord,
  EvidenceLevel,
  GoalLevel,
  GoalSource,
  PlanDraft,
  SkillProgress,
  SkillScope,
  SkillTarget,
  TaskDraft,
  TaskPhase,
  TaskStatus,
} from "@/features/action/types";
export {
  ACTION_LIMITS,
  EVIDENCE_LEVELS,
  GOAL_LEVELS,
  GOAL_SOURCES,
  isGoalLevel,
  SKILL_PROGRESS,
  SKILL_SCOPES,
  TASK_ORIGINS,
  TASK_PHASES,
  TASK_STATUSES,
} from "@/features/action/types";
