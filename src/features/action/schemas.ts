import { z } from "zod";
import {
  EVIDENCE_LEVELS,
  GOAL_LEVELS,
  GOAL_SOURCES,
  SKILL_PROGRESS,
  SKILL_SCOPES,
  TASK_ORIGINS,
  TASK_STATUSES,
} from "@/features/action/types";

/** Atlas node id shape (same idea as career_atlas_marks check). */
export const AtlasGoalNodeId = z
  .string()
  .trim()
  .regex(/^((spec):[a-z0-9-]+|occ:onet:[0-9]{2}-[0-9]{4}[.][0-9]{2})$/, "Choose a specialization or occupation.");

export const GoalSourceSchema = z.enum(GOAL_SOURCES);
export const GoalLevelSchema = z.enum(GOAL_LEVELS);
export const TaskStatusSchema = z.enum(TASK_STATUSES);
export const TaskOriginSchema = z.enum(TASK_ORIGINS);
export const SkillProgressSchema = z.enum(SKILL_PROGRESS);
export const SkillScopeSchema = z.enum(SKILL_SCOPES);
export const EvidenceLevelSchema = z.enum(EVIDENCE_LEVELS);

export const ResolveGoalInput = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("atlas_pursuing"),
    /** Current Atlas pursuing mark; null means none set. */
    pursuingNodeId: AtlasGoalNodeId.nullable(),
  }),
  z.object({
    mode: z.literal("manual"),
    nodeId: AtlasGoalNodeId,
  }),
]);
export type ResolveGoalInput = z.infer<typeof ResolveGoalInput>;

export const UpdateTaskInput = z.object({
  taskId: z.string().uuid(),
  title: z.string().trim().min(1).max(200).optional(),
  status: TaskStatusSchema.optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;

export const UpdateSkillProgressInput = z.object({
  skillId: z.string().uuid(),
  progress: SkillProgressSchema,
});
export type UpdateSkillProgressInput = z.infer<typeof UpdateSkillProgressInput>;

export const AddTaskInput = z.object({
  title: z.string().trim().min(1).max(200),
});
export type AddTaskInput = z.infer<typeof AddTaskInput>;
