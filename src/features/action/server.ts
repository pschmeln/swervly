import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  actionPlans,
  actionSkillProgress,
  actionTasks,
  profiles,
  type ActionPlan,
  type ActionSkillProgress,
  type ActionTask,
  type User,
} from "@/db/schema";
import { isMissingActionRelation, isUniqueViolation } from "@/features/action/db-errors";
import { resolveActionGoal } from "@/features/action/goal";
import { reviseActivePlanSeed, seedAfterGoalChange } from "@/features/action/plan-change";
import { defaultPlanningService } from "@/features/action/planning-service";
import type {
  AddTaskInput,
  ChangeGoalInput,
  SeedPlanInput,
  UpdatePlanInput,
  UpdateSkillProgressInput,
  UpdateTaskInput,
} from "@/features/action/schemas";
import { ACTION_LIMITS, type ActionGoal, type TaskStatus } from "@/features/action/types";
import { loadAtlasState } from "@/features/atlas/server";
import { ApiError } from "@/lib/api";

export type ActionPlanBundle = {
  plan: ActionPlan;
  tasks: ActionTask[];
  skills: ActionSkillProgress[];
};

function asGoal(plan: ActionPlan): ActionGoal {
  return {
    nodeId: plan.goalNodeId as ActionGoal["nodeId"],
    level: plan.goalLevel as ActionGoal["level"],
    title: plan.goalTitle,
    onetCode: plan.goalLevel === "occupation" ? plan.goalNodeId.replace(/^occ:onet:/, "") : null,
    source: plan.goalSource as ActionGoal["source"],
  };
}

async function loadProfileBits(userId: string) {
  const [row] = await db
    .select({ goal: profiles.goal })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return row?.goal ?? null;
}

async function draftFor(
  user: User,
  goal: ActionGoal,
): Promise<Awaited<ReturnType<ReturnType<typeof defaultPlanningService>["draftPlan"]>>> {
  const lifeGoal = await loadProfileBits(user.id);
  return defaultPlanningService().draftPlan({
    userId: user.id,
    goal,
    profile: {
      major: user.major,
      majorSource: user.majorSource,
      year: user.year,
      lifeGoal: lifeGoal === "industry" || lifeGoal === "grad_school" || lifeGoal === "undecided" ? lifeGoal : null,
    },
  });
}

/**
 * Resolve the goal. atlas_pursuing always comes from the server-side Atlas mark —
 * never from a client-supplied occupation id.
 */
export async function resolveGoalFromInput(
  userId: string,
  input: SeedPlanInput["goal"] | ChangeGoalInput["goal"],
): Promise<ActionGoal> {
  if (input.mode === "atlas_pursuing") {
    const pursuing = (await loadAtlasState(userId)).pursuing;
    const resolved = resolveActionGoal({ mode: "atlas_pursuing" }, { atlasPursuing: pursuing });
    if (!resolved.ok) throw new ApiError(400, resolved.code, resolved.message);
    return resolved.goal;
  }
  const resolved = resolveActionGoal(input);
  if (!resolved.ok) throw new ApiError(400, resolved.code, resolved.message);
  return resolved.goal;
}

function mapUnavailable(error: unknown): never {
  if (isMissingActionRelation(error)) {
    throw new ApiError(503, "action_unavailable", "Action plans are not available on this database yet.");
  }
  throw error;
}

export async function getActivePlan(userId: string): Promise<ActionPlanBundle | null> {
  if (!userId) throw new Error("missing_user_id");
  try {
    const [plan] = await db
      .select()
      .from(actionPlans)
      .where(and(eq(actionPlans.userId, userId), eq(actionPlans.status, "active")))
      .limit(1);
    if (!plan) return null;
    const [tasks, skills] = await db.batch([
      db
        .select()
        .from(actionTasks)
        .where(and(eq(actionTasks.userId, userId), eq(actionTasks.planId, plan.id)))
        .orderBy(asc(actionTasks.sortOrder), asc(actionTasks.createdAt)),
      db
        .select()
        .from(actionSkillProgress)
        .where(and(eq(actionSkillProgress.userId, userId), eq(actionSkillProgress.planId, plan.id)))
        .orderBy(asc(actionSkillProgress.skillName)),
    ]);
    return { plan, tasks, skills };
  } catch (error) {
    mapUnavailable(error);
  }
}

/** Load a plan owned by the user (active or archived) for read-only paths. */
export async function getOwnedPlan(userId: string, planId: string): Promise<ActionPlan | null> {
  const [plan] = await db
    .select()
    .from(actionPlans)
    .where(and(eq(actionPlans.userId, userId), eq(actionPlans.id, planId)))
    .limit(1);
  return plan ?? null;
}

async function requireActivePlanForMutableRow(
  userId: string,
  planId: string,
): Promise<ActionPlan> {
  const plan = await getOwnedPlan(userId, planId);
  if (!plan) throw new ApiError(404, "not_found", "Plan not found.");
  if (plan.status !== "active") {
    throw new ApiError(409, "plan_archived", "Archived plans are read-only. Change the active plan instead.");
  }
  return plan;
}

function taskRowsFromDraft(
  userId: string,
  planId: string,
  tasks: Awaited<ReturnType<typeof draftFor>>["tasks"],
  startOrder: number,
  now: Date,
): (typeof actionTasks.$inferInsert)[] {
  return tasks.map((task, index) => ({
    id: crypto.randomUUID(),
    planId,
    userId,
    title: task.title,
    description: task.description,
    phase: task.phase,
    status: task.status,
    sortOrder: startOrder + index,
    origin: task.origin,
    originKey: task.originKey,
    explanation: task.explanation,
    dueOn: task.dueOn,
    completedAt: task.status === "done" ? now : null,
    createdAt: now,
    updatedAt: now,
  }));
}

function skillRowsFromDraft(
  userId: string,
  planId: string,
  skills: Awaited<ReturnType<typeof draftFor>>["skills"],
  now: Date,
): (typeof actionSkillProgress.$inferInsert)[] {
  return skills.slice(0, ACTION_LIMITS.maxSkillsPerPlan).map((skill) => ({
    id: crypto.randomUUID(),
    planId,
    userId,
    skillName: skill.name,
    scope: skill.scope,
    evidence: skill.evidence,
    skillSource: skill.skillSource,
    progress: "unrated" as const,
    originKey: skill.originKey,
    explanation: skill.explanation,
    createdAt: now,
    updatedAt: now,
  }));
}

async function insertPlanBundle(
  planRow: typeof actionPlans.$inferInsert,
  tasks: (typeof actionTasks.$inferInsert)[],
  skills: (typeof actionSkillProgress.$inferInsert)[],
): Promise<void> {
  try {
    if (tasks.length > 0 && skills.length > 0) {
      await db.batch([
        db.insert(actionPlans).values(planRow),
        db.insert(actionTasks).values(tasks),
        db.insert(actionSkillProgress).values(skills),
      ]);
    } else if (tasks.length > 0) {
      await db.batch([db.insert(actionPlans).values(planRow), db.insert(actionTasks).values(tasks)]);
    } else if (skills.length > 0) {
      await db.batch([db.insert(actionPlans).values(planRow), db.insert(actionSkillProgress).values(skills)]);
    } else {
      await db.insert(actionPlans).values(planRow);
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "plan_exists", "You already have an active plan. Change the goal or revise it instead.");
    }
    mapUnavailable(error);
  }
}

/** Create the first active plan from a template seed. Concurrent seeds race on the one-active unique. */
export async function seedActivePlan(user: User, input: SeedPlanInput): Promise<ActionPlanBundle> {
  const existing = await getActivePlan(user.id);
  if (existing) {
    throw new ApiError(409, "plan_exists", "You already have an active plan. Change the goal or revise it instead.");
  }
  const goal = await resolveGoalFromInput(user.id, input.goal);
  const draft = await draftFor(user, goal);
  const now = new Date();
  const planId = crypto.randomUUID();
  const planRow = {
    id: planId,
    userId: user.id,
    goalNodeId: goal.nodeId,
    goalLevel: goal.level,
    goalTitle: goal.title,
    goalSource: goal.source,
    draftSource: "template_v1" as const,
    status: "active" as const,
    weeklyHours: input.weeklyHours ?? null,
    horizonWeeks: input.horizonWeeks ?? null,
    createdAt: now,
    updatedAt: now,
  };
  const tasks = taskRowsFromDraft(user.id, planId, draft.tasks.slice(0, ACTION_LIMITS.maxTasksPerPlan), 0, now);
  const skills = skillRowsFromDraft(user.id, planId, draft.skills, now);
  await insertPlanBundle(planRow, tasks, skills);
  return { plan: planRow as ActionPlan, tasks: tasks as ActionTask[], skills: skills as ActionSkillProgress[] };
}

/**
 * Goal change: archive the active plan intact and insert a new active plan in one
 * db.batch so a failed insert does not leave the student without an active plan
 * (Neon HTTP batch is one request). Never copies skill progress across plans.
 */
export async function changePlanGoal(user: User, input: ChangeGoalInput): Promise<ActionPlanBundle> {
  if (input.copySkillProgress) {
    throw new ApiError(400, "copy_not_allowed", "Skill progress is not copied across plans without a separate confirmation flow.");
  }
  const current = await getActivePlan(user.id);
  if (!current) throw new ApiError(404, "no_plan", "No active plan to change.");

  const goal = await resolveGoalFromInput(user.id, input.goal);
  if (goal.nodeId === current.plan.goalNodeId && goal.source === current.plan.goalSource) {
    throw new ApiError(400, "same_goal", "That is already your active plan's goal.");
  }

  const draft = await draftFor(user, goal);
  const seed = seedAfterGoalChange(draft);
  const now = new Date();
  const planId = crypto.randomUUID();
  const planRow = {
    id: planId,
    userId: user.id,
    goalNodeId: goal.nodeId,
    goalLevel: goal.level,
    goalTitle: goal.title,
    goalSource: goal.source,
    draftSource: "template_v1" as const,
    status: "active" as const,
    weeklyHours: input.weeklyHours ?? current.plan.weeklyHours,
    horizonWeeks: input.horizonWeeks ?? current.plan.horizonWeeks,
    createdAt: now,
    updatedAt: now,
  };
  const tasks = taskRowsFromDraft(
    user.id,
    planId,
    seed.seededTasks.slice(0, ACTION_LIMITS.maxTasksPerPlan),
    0,
    now,
  );
  const skills = skillRowsFromDraft(user.id, planId, seed.seededSkills, now);

  const archive = db
    .update(actionPlans)
    .set({ status: "archived", updatedAt: now })
    .where(and(eq(actionPlans.userId, user.id), eq(actionPlans.id, current.plan.id), eq(actionPlans.status, "active")));
  const insertPlan = db.insert(actionPlans).values(planRow);

  try {
    if (tasks.length > 0 && skills.length > 0) {
      await db.batch([archive, insertPlan, db.insert(actionTasks).values(tasks), db.insert(actionSkillProgress).values(skills)]);
    } else if (tasks.length > 0) {
      await db.batch([archive, insertPlan, db.insert(actionTasks).values(tasks)]);
    } else if (skills.length > 0) {
      await db.batch([archive, insertPlan, db.insert(actionSkillProgress).values(skills)]);
    } else {
      await db.batch([archive, insertPlan]);
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new ApiError(409, "plan_exists", "You already have an active plan. Refresh and try again.");
    }
    mapUnavailable(error);
  }

  return { plan: planRow as ActionPlan, tasks: tasks as ActionTask[], skills: skills as ActionSkillProgress[] };
}

/** Same-plan template refresh: append missing origin_keys only; keep edits and progress. */
export async function reviseActivePlan(user: User): Promise<ActionPlanBundle> {
  const current = await getActivePlan(user.id);
  if (!current) throw new ApiError(404, "no_plan", "No active plan to revise.");

  const draft = await draftFor(user, asGoal(current.plan));
  const revise = reviseActivePlanSeed(
    current.tasks.map((task) => ({
      originKey: task.originKey,
      status: task.status as "todo" | "doing" | "done",
    })),
    current.skills.map((skill) => skill.originKey),
    draft,
  );
  const now = new Date();
  const room = ACTION_LIMITS.maxTasksPerPlan - current.tasks.length;
  const tasksToAdd = revise.tasksToInsert.slice(0, Math.max(0, room));
  const skillRoom = ACTION_LIMITS.maxSkillsPerPlan - current.skills.length;
  const skillsToAdd = revise.skillsToInsert.slice(0, Math.max(0, skillRoom));
  const startOrder = current.tasks.reduce((max, task) => Math.max(max, task.sortOrder), -1) + 1;
  const taskRows = taskRowsFromDraft(user.id, current.plan.id, tasksToAdd, startOrder, now);
  const skillRows = skillRowsFromDraft(user.id, current.plan.id, skillsToAdd, now);

  const touch = db
    .update(actionPlans)
    .set({ updatedAt: now })
    .where(and(eq(actionPlans.userId, user.id), eq(actionPlans.id, current.plan.id), eq(actionPlans.status, "active")));

  if (taskRows.length > 0 && skillRows.length > 0) {
    await db.batch([db.insert(actionTasks).values(taskRows), db.insert(actionSkillProgress).values(skillRows), touch]);
  } else if (taskRows.length > 0) {
    await db.batch([db.insert(actionTasks).values(taskRows), touch]);
  } else if (skillRows.length > 0) {
    await db.batch([db.insert(actionSkillProgress).values(skillRows), touch]);
  }

  return (await getActivePlan(user.id))!;
}

export async function updateActivePlan(userId: string, input: UpdatePlanInput): Promise<ActionPlan> {
  const current = await getActivePlan(userId);
  if (!current) throw new ApiError(404, "no_plan", "No active plan.");
  const now = new Date();
  const patch = {
    ...(input.weeklyHours !== undefined ? { weeklyHours: input.weeklyHours } : {}),
    ...(input.horizonWeeks !== undefined ? { horizonWeeks: input.horizonWeeks } : {}),
    updatedAt: now,
  };
  await db
    .update(actionPlans)
    .set(patch)
    .where(and(eq(actionPlans.userId, userId), eq(actionPlans.id, current.plan.id), eq(actionPlans.status, "active")));
  return { ...current.plan, ...patch };
}

export async function addTask(userId: string, input: AddTaskInput): Promise<ActionTask> {
  const current = await getActivePlan(userId);
  if (!current) throw new ApiError(404, "no_plan", "No active plan.");
  if (current.tasks.length >= ACTION_LIMITS.maxTasksPerPlan) {
    throw new ApiError(400, "task_limit", `A plan can have at most ${ACTION_LIMITS.maxTasksPerPlan} tasks.`);
  }
  const now = new Date();
  const sortOrder = current.tasks.reduce((max, task) => Math.max(max, task.sortOrder), -1) + 1;
  const row = {
    id: crypto.randomUUID(),
    planId: current.plan.id,
    userId,
    title: input.title,
    description: input.description ?? null,
    phase: input.phase ?? null,
    status: "todo" as const,
    sortOrder,
    origin: "user" as const,
    originKey: null,
    explanation: "Added by you.",
    dueOn: input.dueOn ?? null,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(actionTasks).values(row);
  return row as ActionTask;
}

export async function updateTask(userId: string, taskId: string, input: UpdateTaskInput): Promise<ActionTask> {
  const [existing] = await db
    .select()
    .from(actionTasks)
    .where(and(eq(actionTasks.userId, userId), eq(actionTasks.id, taskId)))
    .limit(1);
  if (!existing) throw new ApiError(404, "not_found", "Task not found.");
  await requireActivePlanForMutableRow(userId, existing.planId);

  const now = new Date();
  const nextStatus: TaskStatus | undefined = input.status;
  let completedAt = existing.completedAt;
  if (nextStatus === "done" && existing.status !== "done") completedAt = now;
  if (nextStatus && nextStatus !== "done") completedAt = null;

  const patch = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    ...(input.phase !== undefined ? { phase: input.phase } : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
    ...(input.dueOn !== undefined ? { dueOn: input.dueOn } : {}),
    completedAt,
    updatedAt: now,
  };

  await db
    .update(actionTasks)
    .set(patch)
    .where(and(eq(actionTasks.userId, userId), eq(actionTasks.id, taskId)));

  return { ...existing, ...patch };
}

export async function deleteTask(userId: string, taskId: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(actionTasks)
    .where(and(eq(actionTasks.userId, userId), eq(actionTasks.id, taskId)))
    .limit(1);
  if (!existing) throw new ApiError(404, "not_found", "Task not found.");
  await requireActivePlanForMutableRow(userId, existing.planId);

  const removed = await db
    .delete(actionTasks)
    .where(and(eq(actionTasks.userId, userId), eq(actionTasks.id, taskId)))
    .returning({ id: actionTasks.id });
  if (removed.length === 0) throw new ApiError(404, "not_found", "Task not found.");
}

export async function updateSkillProgress(
  userId: string,
  skillId: string,
  input: UpdateSkillProgressInput,
): Promise<ActionSkillProgress> {
  const [existing] = await db
    .select()
    .from(actionSkillProgress)
    .where(and(eq(actionSkillProgress.userId, userId), eq(actionSkillProgress.id, skillId)))
    .limit(1);
  if (!existing) throw new ApiError(404, "not_found", "Skill progress not found.");
  await requireActivePlanForMutableRow(userId, existing.planId);

  const now = new Date();
  await db
    .update(actionSkillProgress)
    .set({ progress: input.progress, updatedAt: now })
    .where(and(eq(actionSkillProgress.userId, userId), eq(actionSkillProgress.id, skillId)));

  return { ...existing, progress: input.progress, updatedAt: now };
}

/**
 * Account export. Missing Action tables (pre-0009) → empty arrays.
 * Any other database failure propagates so export does not silently drop data.
 */
export async function exportActionData(userId: string): Promise<{
  plans: ActionPlan[];
  tasks: ActionTask[];
  skillProgress: ActionSkillProgress[];
}> {
  try {
    const [plans, tasks, skillProgress] = await db.batch([
      db.select().from(actionPlans).where(eq(actionPlans.userId, userId)).orderBy(asc(actionPlans.createdAt)),
      db.select().from(actionTasks).where(eq(actionTasks.userId, userId)).orderBy(asc(actionTasks.sortOrder)),
      db
        .select()
        .from(actionSkillProgress)
        .where(eq(actionSkillProgress.userId, userId))
        .orderBy(asc(actionSkillProgress.skillName)),
    ]);
    return { plans, tasks, skillProgress };
  } catch (error) {
    if (isMissingActionRelation(error)) {
      return { plans: [], tasks: [], skillProgress: [] };
    }
    throw error;
  }
}
