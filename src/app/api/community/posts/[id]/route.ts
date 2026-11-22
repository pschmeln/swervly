import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { idFrom } from "@/features/community/route-params";
import { PostEditInput } from "@/features/community/rules";
import { deletePost, editPost } from "@/features/community/server";

export const PATCH = handle(async (req, ctx) => {
  const user = await apiOnboardedUser();
  const id = await idFrom(ctx);
  await editPost(user, id, await parseBody(req, PostEditInput));
  return ok({ id });
});

export const DELETE = handle(async (_req, ctx) => {
  const user = await apiOnboardedUser();
  const id = await idFrom(ctx);
  await deletePost(user, id);
  return ok({ id });
});
