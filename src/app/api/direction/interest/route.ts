import { InterestRoleInput, setCareerInterest } from "@/features/direction/interest";
import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";

export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, InterestRoleInput);
  const interestedRoles = await setCareerInterest(user, input.roleType, input.interested);
  return ok({ roleType: input.roleType, interested: interestedRoles.includes(input.roleType), interestedRoles });
});
