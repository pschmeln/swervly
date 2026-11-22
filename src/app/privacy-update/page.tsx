import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Card, PageShell } from "@/components/ui";
import { POLICY_CHANGES } from "@/features/privacy/agree";
import { AgreeButton } from "@/features/privacy/components/agree-button";
import { needsPolicyAgreement, PRIVACY_POLICY_UPDATED, PRIVACY_POLICY_VERSION } from "@/features/privacy/policy-version";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Privacy Policy update" };

const linkClass =
  "inline-flex min-h-12 items-center font-medium text-[#1d4ed8] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

/**
 * Shown before anything else to students who agreed to an older privacy policy.
 * Outside the (app) group so the gate in its layout does not loop.
 */
export default function PrivacyUpdatePage() {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-ink-2">Loading…</p>}>
      <PrivacyUpdate />
    </Suspense>
  );
}

async function PrivacyUpdate() {
  const user = await requireUser();
  if (!needsPolicyAgreement(user)) redirect(ROUTES.home);
  const changes = POLICY_CHANGES[PRIVACY_POLICY_VERSION] ?? [];

  return (
    <PageShell title="We updated our Privacy Policy" description={`Updated ${PRIVACY_POLICY_UPDATED}. Please read what changed and agree to keep using Swervly.`}>
      <Card>
        <h2 className="text-lg font-semibold">What changed</h2>
        <ul className="mt-2 grid list-disc gap-2 pl-5 text-ink-2">
          {changes.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="mt-2">
          <Link href={ROUTES.privacy} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Read the full Privacy Policy
            <span className="sr-only"> (opens in a new tab)</span>
          </Link>
        </p>
        <div className="mt-4">
          <AgreeButton version={PRIVACY_POLICY_VERSION} />
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">If you don&apos;t agree</h2>
        <p className="mt-2 text-ink-2">
          You can download everything Swervly stores about you, and ask us to delete your account at{" "}
          <a href="mailto:support@swervly.com" className="font-medium underline">
            support@swervly.com
          </a>
          .
        </p>
        <p className="mt-1">
          <a href={ROUTES.accountExport} className={linkClass}>
            Download my data
          </a>
        </p>
      </Card>
    </PageShell>
  );
}
