"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorNote } from "@/components/ui";
import type { StudentAdvisorState } from "@/features/advisors/access";
import { ADVISOR_CONSENT_VERSION, ADVISOR_FIELDS, CONSENT_INTRO, NOT_SHARED, ROSTER_PROMPT } from "@/features/advisors/consent";
import { sendCommunity } from "@/features/community/components/api";
import { ROUTES } from "@/lib/constants";

const FIELD_LABEL = new Map<string, string>(ADVISOR_FIELDS.map((field) => [field.id, field.label.split(":")[0]!]));

export const STATUS_LINES: Record<StudentAdvisorState["status"], string> = {
  sharing: "You're sharing your details with your school's advisors.",
  stopped: "You're not sharing your details with your school's advisors.",
  outdated: "What advisors can see has changed since you agreed, so they can't see your details until you agree again.",
  never: "You're not sharing your details with your school's advisors.",
};
export const NO_VIEWS = "No advisor has opened your details.";

/** Settings card (item 15, PR 6.3): the explicit, revocable opt-in, and the log of every advisor view. */
export function AdvisorSharing({ state }: { state: StudentAdvisorState }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const school = state.school;

  async function set(share: boolean) {
    if (!school) return;
    setPending(true);
    setError(null);
    const result = await sendCommunity(ROUTES.advisorGrant, "POST", { schoolId: school.id, share, version: ADVISOR_CONSENT_VERSION });
    setPending(false);
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  }

  const sharing = state.status === "sharing";
  return (
    <Card>
      <h2 className="text-lg font-semibold" id="advisors">Your school&apos;s advisors</h2>
      {!school ? (
        <p className="mt-2 text-neutral-800">Your school isn&apos;t set up for advisors on Swervly, so nobody can see your details.</p>
      ) : (
        <div className="mt-2 grid gap-3">
          {state.onRoster && !sharing && state.status !== "stopped" ? (
            <p className="rounded-xl bg-[#f4f8ff] p-3 font-medium text-ink">{ROSTER_PROMPT}</p>
          ) : null}
          <p className="text-neutral-800">
            <span className="font-medium">{school.name}.</span> {STATUS_LINES[state.status]}
          </p>
          {sharing ? null : (
            <>
              <p className="text-neutral-800">{CONSENT_INTRO}</p>
              <div>
                <h3 className="text-sm font-semibold text-ink">Advisors would see</h3>
                <ul className="mt-1 list-disc pl-5 text-neutral-800">
                  {ADVISOR_FIELDS.map((field) => (
                    <li key={field.id}>{field.label}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-ink">Advisors never see</h3>
                <ul className="mt-1 list-disc pl-5 text-neutral-800">
                  {NOT_SHARED.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
          <p className="text-sm text-neutral-700">
            {state.advisorNames.length === 0
              ? "No advisor at your school is approved yet."
              : `Approved advisors at your school: ${state.advisorNames.join(", ")}.`}
          </p>
          <div>
            {sharing ? (
              <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={pending} onClick={() => void set(false)}>
                Stop sharing
              </Button>
            ) : (
              <Button type="button" className="w-full sm:w-auto" disabled={pending} onClick={() => void set(true)}>
                Share my details with my school&apos;s advisors
              </Button>
            )}
          </div>
          {error ? <ErrorNote>{error}</ErrorNote> : null}
        </div>
      )}
      <div className="mt-4">
        <h3 className="text-sm font-semibold text-ink">Who opened your details</h3>
        {state.log.length === 0 ? (
          <p className="mt-1 text-sm text-neutral-700">{NO_VIEWS}</p>
        ) : (
          <ul className="mt-2 grid gap-2">
            {state.log.map((entry, index) => (
              <li key={`${entry.viewedAt.toISOString()}-${index}`} className="rounded-xl border border-neutral-200 p-3 text-sm text-neutral-800">
                <p className="font-medium text-ink break-words">
                  {entry.advisorName} · {entry.schoolName}
                </p>
                <p>{entry.viewedAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/New_York" })}</p>
                <p className="text-neutral-700">Saw: {entry.fields.map((field) => FIELD_LABEL.get(field) ?? field).join(", ")}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
