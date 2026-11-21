import { z } from "zod";
import {
  ACTION_LIMITS,
  EVIDENCE_LEVELS,
  GOAL_LEVELS,
  GOAL_SOURCES,
  SKILL_PROGRESS,
  SKILL_SCOPES,
  TASK_ORIGINS,
  TASK_PHASES,
  TASK_STATUSES,
} from "@/features/action/types";

/** Atlas node id shape for Action goals (specialization or occupation only). */
export const AtlasGoalNodeId = z
  .string()
  .trim()
  .regex(/^((spec):[a-z0-9-]+|occ:onet:[0-9]{2}-[0-9]{4}[.][0-9]{2})$/, "Choose a specialization or occupation.");

export const GoalSourceSchema = z.enum(GOAL_SOURCES);
export const GoalLevelSchema = z.enum(GOAL_LEVELS);
export const TaskStatusSchema = z.enum(TASK_STATUSES);
export const TaskOriginSchema = z.enum(TASK_ORIGINS);
export const TaskPhaseSchema = z.enum(TASK_PHASES);
export const SkillProgressSchema = z.enum(SKILL_PROGRESS);
export const SkillScopeSchema = z.enum(SKILL_SCOPES);
export const EvidenceLevelSchema = z.enum(EVIDENCE_LEVELS);

/**
 * atlas_pursuing: server loads the saved Atlas mark — clients must not send a node id.
 * manual: client picks a specialization or occupation explicitly.
 */
export const ResolveGoalInput = z.discriminatedUnion("mode", [
  z
    .object({
      mode: z.literal("atlas_pursuing"),
    })
    .strict(),
  z.object({
    mode: z.literal("manual"),
    nodeId: AtlasGoalNodeId,
  }),
]);
export type ResolveGoalInput = z.infer<typeof ResolveGoalInput>;

export const SeedPlanInput = z.object({
  goal: ResolveGoalInput,
  weeklyHours: z.number().int().min(ACTION_LIMITS.weeklyHoursMin).max(ACTION_LIMITS.weeklyHoursMax).nullable().optional(),
  horizonWeeks: z.number().int().min(ACTION_LIMITS.horizonWeeksMin).max(ACTION_LIMITS.horizonWeeksMax).nullable().optional(),
});
export type SeedPlanInput = z.infer<typeof SeedPlanInput>;

export const UpdatePlanInput = z.object({
  weeklyHours: z.number().int().min(ACTION_LIMITS.weeklyHoursMin).max(ACTION_LIMITS.weeklyHoursMax).nullable().optional(),
  horizonWeeks: z.number().int().min(ACTION_LIMITS.horizonWeeksMin).max(ACTION_LIMITS.horizonWeeksMax).nullable().optional(),
});
export type UpdatePlanInput = z.infer<typeof UpdatePlanInput>;

export const UpdateTaskInput = z
  .object({
    title: z.string().trim().min(1).max(ACTION_LIMITS.titleMax).optional(),
    description: z.string().trim().max(ACTION_LIMITS.descriptionMax).nullable().optional(),
    phase: TaskPhaseSchema.nullable().optional(),
    status: TaskStatusSchema.optional(),
    dueOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { error: "Nothing to update." });
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;

export const UpdateSkillProgressInput = z.object({
  progress: SkillProgressSchema,
});
export type UpdateSkillProgressInput = z.infer<typeof UpdateSkillProgressInput>;

export const AddTaskInput = z.object({
  title: z.string().trim().min(1).max(ACTION_LIMITS.titleMax),
  description: z.string().trim().max(ACTION_LIMITS.descriptionMax).nullable().optional(),
  phase: TaskPhaseSchema.nullable().optional(),
  dueOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
    .nullable()
    .optional(),
});
export type AddTaskInput = z.infer<typeof AddTaskInput>;

export const ChangeGoalInput = z.object({
  goal: ResolveGoalInput,
  /** Explicit confirmation required before any future cross-plan skill copy; unused in MVP. */
  copySkillProgress: z.literal(false).optional().default(false),
  weeklyHours: z.number().int().min(ACTION_LIMITS.weeklyHoursMin).max(ACTION_LIMITS.weeklyHoursMax).nullable().optional(),
  horizonWeeks: z.number().int().min(ACTION_LIMITS.horizonWeeksMin).max(ACTION_LIMITS.horizonWeeksMax).nullable().optional(),
});
export type ChangeGoalInput = z.infer<typeof ChangeGoalInput>;
