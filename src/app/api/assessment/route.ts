import { handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { AssessmentInput } from "@/features/profile/schemas";
import { saveAssessment } from "@/features/profile/server";

export const POST = handle(async (req) => {
  const user = await apiUser();
  const input = await parseBody(req, AssessmentInput);
  return ok(await saveAssessment(user.id, input));
});
