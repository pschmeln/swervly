import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { HelpfulInput } from "@/features/community/rules";
import { setHelpful } from "@/features/community/server";

export const PUT = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, HelpfulInput);
  await setHelpful(user, input.target, input.id, input.on);
  return ok({ on: input.on });
});
