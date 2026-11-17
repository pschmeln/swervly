import { handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { PasswordInput } from "@/features/profile/schemas";
import { setPassword } from "@/features/profile/account-actions";

export const POST = handle(async (req) => {
  const user = await apiUser();
  const input = await parseBody(req, PasswordInput);
  await setPassword(user, input.password);
  return ok({ saved: true });
});
