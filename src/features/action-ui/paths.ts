/** Page and API paths. Kept here so this branch does not edit src/lib/constants.ts (PR #50 owns that file). */

export const ACTION_HREF = "/action";

export const ACTION_API = {
  plan: "/api/action/plan",
  revise: "/api/action/plan/revise",
  tasks: "/api/action/tasks",
  task: (id: string) => `/api/action/tasks/${id}`,
  skill: (id: string) => `/api/action/skills/${id}`,
} as const;
