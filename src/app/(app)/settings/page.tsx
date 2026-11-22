import { headers } from "next/headers";
import { PageShell } from "@/components/ui";
import { SettingsForm } from "@/features/profile/components/settings-form";
import { referralSummary } from "@/features/profile/referrals";
import { hasOutdatedShareReviewsConsent, hasShareReviewsConsent } from "@/features/privacy/share-consent";
import { requireUser } from "@/lib/auth";
import { isFounderEmail } from "@/lib/founders";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const [headerList, summary] = await Promise.all([headers(), referralSummary(user.id)]);
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "app.swervly.com";
  const proto = headerList.get("x-forwarded-proto") ?? "https";

  return (
    <PageShell title="Settings">
      <SettingsForm
        shareFreeTextDefault={user.shareFreeTextDefault}
        shareReviewsConsent={hasShareReviewsConsent(user)}
        shareReviewsConsentOutdated={hasOutdatedShareReviewsConsent(user)}
        inviteHref={`${proto}://${host}/invite/${user.referralCode}`}
        finishedCount={summary.finishedOnboardings}
        points={summary.points}
        founder={isFounderEmail(user.email)}
      />
    </PageShell>
  );
}
