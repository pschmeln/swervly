import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { ReportInput } from "@/features/community/rules";
import { reportItem } from "@/features/community/server";

export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, ReportInput);
  await reportItem(user, input.target, input.id, input.reason);
  return ok({ reported: true });
});
