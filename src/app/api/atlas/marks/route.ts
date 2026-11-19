import { MarkInput, saveMark } from "@/features/atlas/server";
import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";

/** Set or clear one Career Atlas mark for the signed-in student. */
export const PUT = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, MarkInput);
  await saveMark(user.id, input);
  return ok({ nodeId: input.nodeId, mark: input.mark });
});
