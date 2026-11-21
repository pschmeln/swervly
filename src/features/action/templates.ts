import { ONET_DETAILS } from "@/content/atlas/onet-details";
import type { ActionGoal, TaskDraft } from "@/features/action/types";

export const TEMPLATE_VERSION = "v1" as const;

const MAX_ONET_TASK_SEEDS = 3;

/** Editorial co-op steps. Always suggestions with an explanation; never hiring claims. */
export const EDITORIAL_TASKS: readonly Omit<TaskDraft, "status">[] = [
  {
    title: "Update your resume for this direction",
    origin: "template",
    originKey: "editorial:resume",
    explanation: "Swervly suggestion: tailor one page so this career goal is obvious to a reader.",
  },
  {
    title: "Find two people who work in this area",
    origin: "template",
    originKey: "editorial:people",
    explanation: "Swervly suggestion: alumni, classmates, or LinkedIn contacts — not a claim that anyone is hiring.",
  },
  {
    title: "Shortlist organizations linked to this area in the career map",
    origin: "template",
    originKey: "editorial:orgs",
    explanation: "Swervly suggestion: use Atlas organization links as starting points, not open roles.",
  },
  {
    title: "After your next co-op, log what you actually did",
    origin: "template",
    originKey: "editorial:review-loop",
    explanation: "Swervly suggestion: Reviews close the Self → Direction → Action → Review loop.",
  },
] as const;

function truncate(text: string, max = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Deterministic starter tasks for a goal. Occupation goals may include up to
 * three O*NET task mirrors; specialization goals get editorial tasks only.
 */
export function templateTasks(goal: ActionGoal): TaskDraft[] {
  const tasks: TaskDraft[] = [];

  if (goal.level === "occupation" && goal.onetCode) {
    const record = ONET_DETAILS[goal.onetCode];
    const onetTasks = record?.tasks.slice(0, MAX_ONET_TASK_SEEDS) ?? [];
    onetTasks.forEach((task, index) => {
      tasks.push({
        title: `Practice: ${truncate(task)}`,
        origin: "template",
        originKey: `onet-task:${index}`,
        explanation: `Adapted from an O*NET important task for ${goal.title}. Practice idea only — not a job duty.`,
        status: "todo",
      });
    });
  }

  for (const item of EDITORIAL_TASKS) {
    tasks.push({ ...item, status: "todo" });
  }

  return tasks;
}
