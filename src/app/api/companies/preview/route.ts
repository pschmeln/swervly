import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { previewCompany } from "@/features/company/server";
import { CompanyPreviewInput } from "@/features/review/schemas";

export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, CompanyPreviewInput);
  return ok(await previewCompany(user, input));
});
