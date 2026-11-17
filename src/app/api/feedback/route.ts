import { handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { saveFeedback } from "@/features/profile/account-actions";
import { FeedbackInput } from "@/features/profile/schemas";

export const POST = handle(async (req) => {
  const user = await apiUser();
  const input = await parseBody(req, FeedbackInput);
  return ok(await saveFeedback(user.id, input));
});
