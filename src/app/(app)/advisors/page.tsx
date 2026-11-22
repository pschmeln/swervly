import { Card, PageShell } from "@/components/ui";
import { AdvisorRequestForm } from "@/features/advisors/components/advisor-request-form";
import { ADVISOR_INTRO, APPROVED, NO_SCHOOL, PENDING, REVOKED } from "@/features/advisors/copy";
import { advisorStateFor } from "@/features/advisors/server";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Advisors" };

/** Advisor access (item 15, PR 6.1). Signed in, not necessarily onboarded as a student. */
export default async function AdvisorsPage() {
  const user = await requireUser();
  const state = await advisorStateFor(user);
  return (
    <PageShell title="Advisors">
      <Card>
        <p className="text-neutral-800">{ADVISOR_INTRO}</p>
        {state.kind === "no_school" ? <p className="mt-3 text-neutral-800">{NO_SCHOOL}</p> : null}
        {state.kind === "can_request" ? <AdvisorRequestForm schoolName={state.school.name} needsPrivacy={user.consentPrivacyAt == null} /> : null}
        {state.kind === "pending" || state.kind === "approved" || state.kind === "revoked" ? (
          <div className="mt-3 grid gap-1">
            <p className="font-medium text-ink break-words">
              {state.displayName} · {state.school.name}
            </p>
            <p className="text-neutral-800">{state.kind === "pending" ? PENDING : state.kind === "approved" ? APPROVED : REVOKED}</p>
          </div>
        ) : null}
      </Card>
    </PageShell>
  );
}
