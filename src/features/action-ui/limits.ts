/**
 * Must match ACTION_LIMITS in src/features/action/types.ts (PR #50).
 * Switch to that shared constant once #50 merges:
 * export { ACTION_LIMITS } from "@/features/action/types";
 */
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
