import { ROUTES } from "@/lib/constants";

/** Page path. The API paths are the routes #50 added to ROUTES. */
export const ACTION_HREF = "/action";

export const ACTION_API = {
  plan: ROUTES.actionPlan,
  revise: ROUTES.actionPlanRevise,
  tasks: ROUTES.actionTasks,
  task: (id: string) => ROUTES.actionTask.replace("[id]", id),
  skill: (id: string) => ROUTES.actionSkill.replace("[id]", id),
} as const;
