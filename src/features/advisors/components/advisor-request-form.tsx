"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Checkbox, ErrorNote, Field, TextInput } from "@/components/ui";
import { focusRing } from "@/components/ui/focus-ring";
import { sendCommunity } from "@/features/community/components/api";
import { ROUTES } from "@/lib/constants";

/** Ask for advisor access. The school comes from the sign-in email on the server. */
export function AdvisorRequestForm({ schoolName, needsPrivacy }: { schoolName: string; needsPrivacy: boolean }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [agree, setAgree] = useState(!needsPrivacy);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!agree) return setError("Agree to the Privacy Policy to continue.");
    setPending(true);
    setError(null);
    const result = await sendCommunity(ROUTES.advisorRequest, "POST", { displayName, agreePrivacy: true });
    setPending(false);
    if (!result.ok) return setError(result.error.fields?.displayName ?? result.error.message);
    router.refresh();
  }

  return (
    <form className="mt-4 grid gap-3" noValidate onSubmit={submit}>
      <p className="text-neutral-800">
        School: <span className="font-medium">{schoolName}</span> (from your sign-in email)
      </p>
      <Field label="Your name" htmlFor="advisor-name" hint="Students who share their details with your school's advisors see this name in their log.">
        <TextInput id="advisor-name" value={displayName} maxLength={80} disabled={pending} onChange={(event) => setDisplayName(event.target.value)} />
      </Field>
      {needsPrivacy ? (
        <div className="grid gap-1">
          <Checkbox id="advisor-privacy" checked={agree} disabled={pending} onChange={(event) => setAgree(event.target.checked)}
            label="I agree to the Swervly Privacy Policy." />
          <Link href={ROUTES.privacy} className={`inline-flex min-h-12 items-center text-sm underline ${focusRing}`}>
            Read the Privacy Policy
          </Link>
        </div>
      ) : null}
      <div>
        <Button type="submit" disabled={pending || displayName.trim().length < 2} className="w-full sm:w-auto">
          {pending ? "Sending…" : "Ask for advisor access"}
        </Button>
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </form>
  );
}
