import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { idFrom } from "@/features/community/route-params";
import { CommentInput } from "@/features/community/rules";
import { deleteComment, editComment } from "@/features/community/server";

export const PATCH = handle(async (req, ctx) => {
  const user = await apiOnboardedUser();
  const id = await idFrom(ctx);
  const { body } = await parseBody(req, CommentInput);
  await editComment(user, id, body);
  return ok({ id });
});

export const DELETE = handle(async (_req, ctx) => {
  const user = await apiOnboardedUser();
  const id = await idFrom(ctx);
  await deleteComment(user, id);
  return ok({ id });
});
