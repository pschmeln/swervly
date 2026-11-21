import { ChangeGoalInput, SeedPlanInput, UpdatePlanInput } from "@/features/action/schemas";
import {
  changePlanGoal,
  getActivePlan,
  seedActivePlan,
  updateActivePlan,
} from "@/features/action/server";
import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";

/** Active Action plan (null data when none). */
export const GET = handle(async () => {
  const user = await apiOnboardedUser();
  const bundle = await getActivePlan(user.id);
  return ok(bundle);
});

/** Seed the first active plan from the template PlanningService. */
export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, SeedPlanInput);
  const bundle = await seedActivePlan(user, input);
  return ok(bundle);
});

/** Update weekly hours / horizon on the active plan. */
export const PATCH = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, UpdatePlanInput);
  const plan = await updateActivePlan(user.id, input);
  return ok({ plan });
});

/** Change goal: archive current plan intact; seed a new active plan (no skill copy). */
export const PUT = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, ChangeGoalInput);
  const bundle = await changePlanGoal(user, input);
  return ok(bundle);
});
