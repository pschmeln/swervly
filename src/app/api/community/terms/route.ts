import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { TermsInput } from "@/features/community/rules";
import { agreeToCommunityTerms } from "@/features/community/server";

export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  await parseBody(req, TermsInput);
  await agreeToCommunityTerms(user.id);
  return ok({ agreed: true });
});
