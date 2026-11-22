import { handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { changeRoster } from "@/features/advisors/roster";
import { RosterInput } from "@/features/advisors/schemas";
import { requireApprovedAdvisor } from "@/features/advisors/server";

/** Approved advisors only: add, remove or clear their school's roster. Emails are hashed, never stored or logged. */
export const POST = handle(async (req) => {
  const user = await apiUser();
  // Role checked on every request, before the body is read; anyone else gets "not found".
  const advisor = await requireApprovedAdvisor(user);
  const input = await parseBody(req, RosterInput);
  return ok(await changeRoster(advisor, input));
});
