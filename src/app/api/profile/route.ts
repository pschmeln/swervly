import { handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { ProfileWriteInput } from "@/features/majors/selection";
import { saveProfile } from "@/features/profile/server";

export const PUT = handle(async (req) => {
  const user = await apiUser();
  const input = await parseBody(req, ProfileWriteInput);
  return ok(await saveProfile(user.id, input));
});
