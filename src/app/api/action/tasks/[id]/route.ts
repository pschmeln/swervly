import { UpdateTaskInput } from "@/features/action/schemas";
import { deleteTask, updateTask } from "@/features/action/server";
import { ApiError, handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";

async function taskId(params: Promise<Record<string, string | string[]>>): Promise<string> {
  const resolved = await params;
  const id = resolved.id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new ApiError(400, "invalid_id", "Task id must be a UUID.");
  }
  return id;
}

export const PATCH = handle(async (req, ctx) => {
  const user = await apiOnboardedUser();
  const id = await taskId(ctx.params);
  const input = await parseBody(req, UpdateTaskInput);
  const task = await updateTask(user.id, id, input);
  return ok({ task });
});

export const DELETE = handle(async (_req, ctx) => {
  const user = await apiOnboardedUser();
  const id = await taskId(ctx.params);
  await deleteTask(user.id, id);
  return ok({ deleted: true });
});
