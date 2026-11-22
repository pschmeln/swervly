import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { PostInput } from "@/features/community/rules";
import { createPost } from "@/features/community/server";

export const POST = handle(async (req) => {
  const user = await apiOnboardedUser();
  const input = await parseBody(req, PostInput);
  return ok(await createPost(user, input));
});
