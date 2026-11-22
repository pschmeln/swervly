"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote, Field, Textarea } from "@/components/ui";
import { COMMENT_MAX, COMMUNITY_TERMS_VERSION } from "@/features/community/rules";
import { ROUTES } from "@/lib/constants";
import { sendCommunity } from "./api";
import { CommunityTerms } from "./terms";

export function AnswerComposer({ postId, agreed, label = "Your answer" }: { postId: string; agreed: boolean; label?: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!agreed && !termsChecked) return setError("Agree to the Community rules to answer.");
    setPending(true);
    setError(null);
    if (!agreed) {
      const terms = await sendCommunity(ROUTES.communityTerms, "POST", { version: COMMUNITY_TERMS_VERSION });
      if (!terms.ok) {
        setError(terms.error.message);
        setPending(false);
        return;
      }
    }
    const result = await sendCommunity(ROUTES.communityPostComments.replace("[id]", postId), "POST", { body });
    setPending(false);
    if (!result.ok) return setError(result.error.fields?.body ?? result.error.message);
    setBody("");
    router.refresh();
  }

  return (
    <form className="grid gap-2" noValidate onSubmit={submit}>
      <Field label={label} htmlFor="answer-body" hint="Other students see it without your name.">
        <Textarea id="answer-body" value={body} rows={3} maxLength={COMMENT_MAX} disabled={pending} onChange={(event) => setBody(event.target.value)} />
      </Field>
      {agreed ? null : <CommunityTerms checked={termsChecked} onChange={setTermsChecked} disabled={pending} />}
      <div><Button type="submit" disabled={pending || body.trim().length === 0} className="w-full sm:w-auto">{pending ? "Posting…" : "Post answer"}</Button></div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </form>
  );
}
