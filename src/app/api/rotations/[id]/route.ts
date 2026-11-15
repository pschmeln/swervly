import { ApiError, handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { RotationInput } from "@/features/review/schemas";
import { deleteRotation, updateRotation } from "@/features/review/server";

async function rotationIdFrom(ctx: {
  params: Promise<Record<string, string | string[]>>;
}): Promise<string> {
  const params = await ctx.params;
  const id = params.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new ApiError(400, "invalid_body", "Rotation id is required.");
  }
  return id;
}

export const PUT = handle(async (req, ctx) => {
  const user = await apiOnboardedUser();
  const id = await rotationIdFrom(ctx);
  const body = await parseBody(req, RotationInput);
  const data = await updateRotation(user.id, id, body);
  return ok(data);
});

export const DELETE = handle(async (_req, ctx) => {
  const user = await apiOnboardedUser();
  const id = await rotationIdFrom(ctx);
  const data = await deleteRotation(user.id, id);
  return ok(data);
});
