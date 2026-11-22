import { handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { agreeToPolicy, PolicyAgreeInput } from "@/features/privacy/agree";

export const POST = handle(async (req) => {
  const user = await apiUser();
  await parseBody(req, PolicyAgreeInput);
  await agreeToPolicy(user.id);
  return ok({ agreed: true });
});
