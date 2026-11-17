import { handle, ok, parseBody } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { saveShareDefault } from "@/features/profile/account-actions";
import { hasShareReviewsConsent } from "@/features/privacy/share-consent";
import { ShareDefaultInput } from "@/features/profile/schemas";

export const PUT = handle(async (req) => {
  const user = await apiUser();
  const input = await parseBody(req, ShareDefaultInput);
  await saveShareDefault(user.id, input);
  const shareReviewsConsent =
    input.shareReviewsConsent !== undefined
      ? input.shareReviewsConsent
      : hasShareReviewsConsent(user);
  return ok({
    shareFreeTextDefault: input.shareFreeTextDefault,
    shareReviewsConsent,
  });
});
