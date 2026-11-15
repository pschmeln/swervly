import { handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { ProfileInput } from "@/features/profile/schemas";
import { saveProfile } from "@/features/profile/server";

export const PUT = handle(async (req) => {
  const user = await apiUser();
  const input = await parseBody(req, ProfileInput);
  return ok(await saveProfile(user.id, input));
});
