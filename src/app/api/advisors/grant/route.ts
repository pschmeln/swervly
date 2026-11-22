import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { setAdvisorGrant } from "@/features/advisors/access";
import { AdvisorGrantInput } from "@/features/advisors/schemas";

/** A student turns sharing with their own school's advisors on or off (item 15). Off takes effect at once. */
export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, AdvisorGrantInput);
  return ok(await setAdvisorGrant(user, input));
});
