import { handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { AdvisorRequestInput } from "@/features/advisors/schemas";
import { requestAdvisorAccess } from "@/features/advisors/server";

/** Ask for advisor access (item 15). Signed in, not necessarily onboarded as a student. */
export const POST = handle(async (req) => {
  const user = await apiUser();
  const input = await parseBody(req, AdvisorRequestInput);
  return ok(await requestAdvisorAccess(user, input));
});
