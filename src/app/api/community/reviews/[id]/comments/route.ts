import { handle, ok, parseBody } from "@/lib/api";
import { apiOnboardedUser } from "@/lib/auth";
import { createReviewComment } from "@/features/company/server";
import { idFrom } from "@/features/community/route-params";
import { CommentInput } from "@/features/community/rules";

/** Comment on a shared review note the viewer can see (item 16). Edit, delete, Helpful and Report reuse the comment routes. */
export const POST = handle(async (req, ctx) => {
  const user = await apiOnboardedUser();
  const reviewId = await idFrom(ctx);
  const { body } = await parseBody(req, CommentInput);
  return ok(await createReviewComment(user, reviewId, body));
});
