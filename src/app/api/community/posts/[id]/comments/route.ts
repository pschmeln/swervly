import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { idFrom } from "@/features/community/route-params";
import { CommentInput } from "@/features/community/rules";
import { createComment } from "@/features/community/server";

export const POST = handle(async (req, ctx) => {
  const user = await apiOnboardedUser();
  const postId = await idFrom(ctx);
  const { body } = await parseBody(req, CommentInput);
  return ok(await createComment(user, postId, body));
});
