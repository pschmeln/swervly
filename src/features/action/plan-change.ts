import type { ActionTaskRecord, PlanDraft, TaskDraft } from "@/features/action/types";

export type PlanChangeResult = {
  /** New template/user tasks for the new goal (todo). */
  seededTasks: TaskDraft[];
  /** Completed tasks carried forward so progress is not lost. */
  preservedCompleted: TaskDraft[];
};

/**
 * When the student changes career goal, seed a new draft but keep every
 * completed task. Titles stay as the student left them; origin becomes
 * `preserved` with a stable key so a later refresh will not duplicate them.
 */
export function tasksAfterGoalChange(
  previousTasks: readonly Pick<ActionTaskRecord, "title" | "status" | "originKey" | "explanation">[],
  nextDraft: PlanDraft,
): PlanChangeResult {
  const preservedCompleted: TaskDraft[] = previousTasks
    .filter((task) => task.status === "done")
    .map((task, index) => ({
      title: task.title,
      origin: "preserved",
      originKey: task.originKey ? `preserved:${task.originKey}` : `preserved:done:${index}`,
      explanation: "Kept from your previous plan because you marked it done.",
      status: "done",
    }));

  const preservedKeys = new Set(preservedCompleted.map((task) => task.originKey));
  // Avoid re-seeding a template row the student already completed under the same origin key family.
  const completedTemplateKeys = new Set(
    previousTasks
      .filter((task) => task.status === "done" && task.originKey)
      .map((task) => task.originKey as string),
  );

  const seededTasks = nextDraft.tasks.filter((task) => {
    if (preservedKeys.has(task.originKey)) return false;
    if (completedTemplateKeys.has(task.originKey)) return false;
    return true;
  });

  return { seededTasks, preservedCompleted };
}

/** Merge seeded + preserved into one ordered list for a new active plan. */
export function orderedTasksForNewPlan(change: PlanChangeResult): TaskDraft[] {
  return [...change.seededTasks, ...change.preservedCompleted];
}
