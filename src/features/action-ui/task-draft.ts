import type { TaskPhase, TaskStatus, TaskView } from "@/features/action-ui/types";

/** Form values for adding or editing a step. Separate from the server TaskDraft. */
export type TaskDraft = {
  title: string;
  description: string;
  phase: TaskPhase | "";
  dueOn: string;
  status: TaskStatus;
};

export function draftFromTask(task: TaskView): TaskDraft {
  return {
    title: task.title,
    description: task.description ?? "",
    phase: task.phase ?? "",
    dueOn: task.dueOn ?? "",
    status: task.status,
  };
}

export function emptyDraft(): TaskDraft {
  return { title: "", description: "", phase: "", dueOn: "", status: "todo" };
}
