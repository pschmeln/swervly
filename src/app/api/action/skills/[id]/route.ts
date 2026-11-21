import { UpdateSkillProgressInput } from "@/features/action/schemas";
import { updateSkillProgress } from "@/features/action/server";
import { ApiError, handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";

export const PATCH = handle(async (req, ctx) => {
  const user = await apiOnboardedUser();
  const resolved = await ctx.params;
  const id = resolved.id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) {
    throw new ApiError(400, "invalid_id", "Skill id must be a UUID.");
  }
  const input = await parseBody(req, UpdateSkillProgressInput);
  const skill = await updateSkillProgress(user.id, id, input);
  return ok({ skill });
});
