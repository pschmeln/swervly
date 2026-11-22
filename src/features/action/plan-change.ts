import type { ActionTaskRecord, PlanDraft, SkillTarget, TaskDraft } from "@/features/action/types";

export type GoalChangeSeed = {
  /** Always a fresh template seed. Completed work stays on the archived plan. */
  seededTasks: TaskDraft[];
  seededSkills: SkillTarget[];
};

/**
 * Goal change: the previous plan is archived intact (caller's job). The new plan
 * gets a fresh deterministic seed only — never silently move or duplicate
 * completed tasks from an unrelated/archived plan.
 */
export function seedAfterGoalChange(nextDraft: PlanDraft): GoalChangeSeed {
  return {
    seededTasks: nextDraft.tasks.map((task) => ({ ...task, status: "todo" })),
    seededSkills: nextDraft.skills,
  };
}

export type SamePlanReviseResult = {
  /** Template tasks whose origin_key is not already on the plan. */
  tasksToInsert: TaskDraft[];
  /** Skill targets whose origin_key is not already on the plan (progress starts unrated). */
  skillsToInsert: SkillTarget[];
};

/**
 * Same-plan revise/refresh: keep student edits and completed tasks; only append
 * missing template origin_keys. Never overwrite titles, statuses, or skill progress.
 * Never copy skill confidence from another plan.
 */
export function reviseActivePlanSeed(
  existingTasks: readonly Pick<ActionTaskRecord, "originKey" | "status">[],
  existingSkillOriginKeys: readonly string[],
  nextDraft: PlanDraft,
): SamePlanReviseResult {
  const existingTaskKeys = new Set(
    existingTasks.map((task) => task.originKey).filter((key): key is string => Boolean(key)),
  );
  const existingSkillKeys = new Set(existingSkillOriginKeys);

  return {
    tasksToInsert: nextDraft.tasks.filter((task) => !existingTaskKeys.has(task.originKey)),
    skillsToInsert: nextDraft.skills.filter((skill) => !existingSkillKeys.has(skill.originKey)),
  };
}
