/**
 * Mirror of ACTION_LIMITS in src/features/action/types.ts at PR #50 commit 4995fab
 * (dto.ts@4995fab). Values are unchanged from 20edb66.
 *
 * TODO: once PR #50 merges, replace this declaration with:
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
