import { dismissCareerRole, DismissRoleInput } from "@/features/direction/dismiss";
import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";

export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, DismissRoleInput);
  await dismissCareerRole(user.id, user.dismissedCareerRoles, input.roleType, user.interestedCareerRoles);
  return ok({ roleType: input.roleType });
});
