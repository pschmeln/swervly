"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote, Field, Textarea } from "@/components/ui";
import { extractEmails, ROSTER_BATCH_MAX } from "@/features/advisors/emails";
import { sendCommunity } from "@/features/community/components/api";
import { ROUTES } from "@/lib/constants";

export const ROSTER_PRIVACY =
  "Swervly stores only a scrambled fingerprint of each address, never the address, and never tells you whether an address has an account.";

/** Paste emails or pick a CSV, then add them to or remove them from the roster. Clear empties it. */
export function RosterManager({ rosterSize }: { rosterSize: number }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const emails = extractEmails(text);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setText(await file.text());
  }

  async function send(body: unknown, done: string) {
    setPending(true);
    setError(null);
    setNotice(null);
    const result = await sendCommunity<{ rosterSize: number }>(ROUTES.advisorRoster, "POST", body);
    setPending(false);
    if (!result.ok) return setError(result.error.message);
    setText("");
    setConfirmClear(false);
    setNotice(`${done} Your roster now has ${result.data.rosterSize} ${result.data.rosterSize === 1 ? "email" : "emails"}.`);
    router.refresh();
  }

  const tooMany = emails.length > ROSTER_BATCH_MAX;
  return (
    <div className="mt-2 grid gap-3">
      <p className="text-neutral-800">
        {rosterSize} {rosterSize === 1 ? "email" : "emails"} on your roster. {ROSTER_PRIVACY}
      </p>
      <Field label="Student emails" htmlFor="roster-emails" hint="Paste addresses, one per line or separated by commas, or choose a CSV file.">
        <Textarea id="roster-emails" value={text} rows={5} disabled={pending} onChange={(event) => setText(event.target.value)} />
      </Field>
      <input
        type="file"
        accept=".csv,text/csv,text/plain"
        aria-label="Choose a CSV file"
        disabled={pending}
        className="min-h-12 text-sm"
        onChange={(event) => void pickFile(event.target.files?.[0])}
      />
      <p className="text-sm text-neutral-700">
        {emails.length} {emails.length === 1 ? "email" : "emails"} found{tooMany ? `. Send ${ROSTER_BATCH_MAX} or fewer at a time.` : "."}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" className="w-full sm:w-auto" disabled={pending || emails.length === 0 || tooMany}
          onClick={() => void send({ action: "add", emails }, "Added.")}>
          Add to roster
        </Button>
        <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={pending || emails.length === 0 || tooMany}
          onClick={() => void send({ action: "remove", emails }, "Removed.")}>
          Remove from roster
        </Button>
      </div>
      {confirmClear ? (
        <div className="grid gap-2 rounded-xl border border-neutral-200 p-3">
          <p className="text-neutral-800">Remove every email from your school&apos;s roster?</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" disabled={pending} onClick={() => void send({ action: "clear" }, "Cleared.")}>
              Yes, clear the roster
            </Button>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={pending} onClick={() => setConfirmClear(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : rosterSize > 0 ? (
        <div>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={pending} onClick={() => setConfirmClear(true)}>
            Clear roster
          </Button>
        </div>
      ) : null}
      {notice ? <p className="text-neutral-800" role="status">{notice}</p> : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </div>
  );
}
