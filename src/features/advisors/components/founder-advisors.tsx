"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorNote, Field, TextInput } from "@/components/ui";
import { splitDomains } from "@/features/advisors/schemas";
import type { FounderAdvisor, FounderSchool } from "@/features/advisors/server";
import { sendCommunity } from "@/features/community/components/api";
import { ROUTES } from "@/lib/constants";

export const NO_SCHOOLS = "No schools yet. Add one before any advisor can ask for access.";
export const NO_ADVISORS = "No advisor requests yet.";

const STATUS_LABELS: Record<string, string> = { pending: "Waiting", approved: "Approved", revoked: "Revoked" };

function useFounderAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function send(body: unknown): Promise<boolean> {
    setBusy(true);
    setError(null);
    const result = await sendCommunity<{ id: string }>(ROUTES.foundersAdvisorsApi, "POST", body);
    setBusy(false);
    if (!result.ok) {
      const fields = result.error.fields ?? {};
      setError(Object.values(fields)[0] ?? result.error.message);
      return false;
    }
    router.refresh();
    return true;
  }
  return { busy, error, send };
}

/** Founder-only (item 15, PR 6.1): schools and their sign-in domains, and advisor requests. */
export function FounderAdvisors({ schools, advisors }: { schools: FounderSchool[]; advisors: FounderAdvisor[] }) {
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-semibold">Schools</h2>
        <p className="mt-1 text-neutral-700">
          A school is a name plus every email domain its staff and students sign in with (for UC: uc.edu and mail.uc.edu).
          Advisors ask for access at {ROUTES.advisors} with their school email.
        </p>
        <NewSchool />
        {schools.length === 0 ? <p className="mt-3 text-neutral-700">{NO_SCHOOLS}</p> : null}
        <ul className="mt-3 grid gap-4">
          {schools.map((school) => (
            <SchoolRow key={school.id} school={school} />
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Advisor requests</h2>
        <p className="mt-1 text-neutral-700">Approve only people you have confirmed are advisors at that school.</p>
        {advisors.length === 0 ? <p className="mt-3 text-neutral-700">{NO_ADVISORS}</p> : null}
        <ul className="mt-3 grid gap-4">
          {advisors.map((advisor) => (
            <AdvisorRow key={advisor.userId} advisor={advisor} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

function NewSchool() {
  const { busy, error, send } = useFounderAction();
  const [name, setName] = useState("");
  const [domains, setDomains] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (await send({ action: "create_school", name, domains: splitDomains(domains) })) {
      setName("");
      setDomains("");
    }
  }
  return (
    <form className="mt-3 grid gap-2 rounded-2xl border border-neutral-200 p-3" noValidate onSubmit={submit}>
      <Field label="School name" htmlFor="new-school-name">
        <TextInput id="new-school-name" value={name} maxLength={120} disabled={busy} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Email domains" htmlFor="new-school-domains" hint="Separate with commas: uc.edu, mail.uc.edu">
        <TextInput id="new-school-domains" value={domains} disabled={busy} onChange={(event) => setDomains(event.target.value)} />
      </Field>
      <div>
        <Button type="submit" disabled={busy || name.trim().length < 2 || domains.trim().length === 0} className="w-full sm:w-auto">
          Add school
        </Button>
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </form>
  );
}

function SchoolRow({ school }: { school: FounderSchool }) {
  const { busy, error, send } = useFounderAction();
  const [domains, setDomains] = useState(school.domains.join(", "));
  return (
    <li className="grid gap-2 border-t border-neutral-200 pt-3">
      <p className="break-words font-medium">{school.name}</p>
      <Field label="Email domains" htmlFor={`school-domains-${school.id}`}>
        <TextInput id={`school-domains-${school.id}`} value={domains} disabled={busy} onChange={(event) => setDomains(event.target.value)} />
      </Field>
      <div>
        <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={busy}
          onClick={() => void send({ action: "set_domains", schoolId: school.id, domains: splitDomains(domains) })}>
          Save domains
        </Button>
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </li>
  );
}

function AdvisorRow({ advisor }: { advisor: FounderAdvisor }) {
  const { busy, error, send } = useFounderAction();
  return (
    <li className="grid gap-2 border-t border-neutral-200 pt-3">
      <p className="break-words font-medium">{advisor.displayName}</p>
      <p className="break-words text-sm text-neutral-700">
        {advisor.email} · {advisor.schoolName} · {STATUS_LABELS[advisor.status] ?? advisor.status}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        {advisor.status !== "approved" ? (
          <Button type="button" className="w-full sm:w-auto" disabled={busy}
            onClick={() => void send({ action: "decide_advisor", userId: advisor.userId, decision: "approve" })}>
            Approve
          </Button>
        ) : null}
        {advisor.status !== "revoked" ? (
          <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={busy}
            onClick={() => void send({ action: "decide_advisor", userId: advisor.userId, decision: "revoke" })}>
            {advisor.status === "pending" ? "Decline" : "Revoke"}
          </Button>
        ) : null}
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </li>
  );
}
