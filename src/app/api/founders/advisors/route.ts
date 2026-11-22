import { ApiError, handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { FounderAdvisorInput } from "@/features/advisors/schemas";
import { founderAdvisorAction } from "@/features/advisors/server";
import { isFounderEmail } from "@/lib/founders";

/** Founder-only: create schools, set their email domains, approve or revoke advisors (item 15). */
export const POST = handle(async (req) => {
  const user = await apiUser();
  // Checked on every request, before the body is read. Non-founders get the same 404 as a missing route.
  if (!isFounderEmail(user.email)) throw new ApiError(404, "not_found", "Not found.");
  const input = await parseBody(req, FounderAdvisorInput);
  return ok(await founderAdvisorAction(user, input));
});
