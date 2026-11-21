import { AddTaskInput } from "@/features/action/schemas";
import { addTask } from "@/features/action/server";
import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";

/** Add a user-authored task on the active plan. */
export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, AddTaskInput);
  const task = await addTask(user.id, input);
  return ok({ task });
});
