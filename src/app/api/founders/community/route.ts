import { handle, ok, parseBody, ApiError } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { CommunityModerationInput, moderateCommunity } from "@/features/community/moderation";
import { isFounderEmail } from "@/lib/founders";

/** Founder-only: keep, hide, restore or remove a reported Community post or answer. */
export const POST = handle(async (req) => {
  const user = await apiUser();
  // Checked on every request, before the body is read. Non-founders get the same 404 as a missing route.
  if (!isFounderEmail(user.email)) throw new ApiError(404, "not_found", "Not found.");
  const input = await parseBody(req, CommunityModerationInput);
  return ok(await moderateCommunity(input));
});
