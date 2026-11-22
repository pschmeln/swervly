"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, ErrorNote, Field, Textarea } from "@/components/ui";
import { focusRing } from "@/components/ui/focus-ring";
import { COMMUNITY_TERMS_VERSION, SHARE_LINE_MAX } from "@/features/community/rules";
import { ROUTES } from "@/lib/constants";
import { sendCommunity } from "./api";
import { CommunityTerms } from "./terms";

export const SHARE_EXPLAINER = "Other students see the card's name and description, plus your line, without your name. Your trait readings stay private.";

/** "Share to Community" on the work-style card (item 19): one tap opens an optional line, then posts. */
export function ShareArchetype({ agreed }: { agreed: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postId, setPostId] = useState<string | null>(null);

  if (postId) {
    return (
      <p className="mt-4 text-ink">
        Shared.{" "}
        <Link href={ROUTES.communityPost.replace("[id]", postId)} className={`inline-flex min-h-12 items-center font-medium underline ${focusRing}`}>
          See it in Community
        </Link>
      </p>
    );
  }

  if (!open) {
    return (
      <div className="mt-4">
        <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
          Share to Community
        </Button>
      </div>
    );
  }

  async function share(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!agreed && !termsChecked) return setError("Agree to the Community rules to share.");
    setPending(true);
    setError(null);
    if (!agreed) {
      const terms = await sendCommunity(ROUTES.communityTerms, "POST", { version: COMMUNITY_TERMS_VERSION });
      if (!terms.ok) {
        setPending(false);
        return setError(terms.error.message);
      }
    }
    const result = await sendCommunity<{ id: string }>(ROUTES.communityArchetypeShare, "POST", { text });
    setPending(false);
    if (!result.ok) return setError(result.error.fields?.text ?? result.error.message);
    setPostId(result.data.id);
  }

  return (
    <form className="mt-4 grid gap-2 rounded-2xl border border-neutral-200 bg-white p-3" noValidate onSubmit={share}>
      <Field label="Add a line (optional)" htmlFor="share-archetype-line" hint={SHARE_EXPLAINER}>
        <Textarea id="share-archetype-line" value={text} rows={2} maxLength={SHARE_LINE_MAX} disabled={pending} onChange={(event) => setText(event.target.value)} />
      </Field>
      {agreed ? null : <CommunityTerms checked={termsChecked} onChange={setTermsChecked} disabled={pending} />}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Sharing…" : "Share"}</Button>
        <Button type="button" variant="secondary" disabled={pending} className="w-full sm:w-auto" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </form>
  );
}
