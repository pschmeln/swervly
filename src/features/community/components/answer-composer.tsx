"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote, Field, Textarea } from "@/components/ui";
import { COMMENT_MAX, COMMUNITY_TERMS_VERSION } from "@/features/community/rules";
import { ROUTES } from "@/lib/constants";
import { sendCommunity } from "./api";
import { CommunityTerms } from "./terms";

/** Answer a post, or (with reviewId) comment on a shared review note. */
export function AnswerComposer({
  postId,
  reviewId,
  agreed,
  label = "Your answer",
  submitLabel = "Post answer",
}: {
  postId?: string;
  reviewId?: string;
  agreed: boolean;
  label?: string;
  submitLabel?: string;
}) {
  const fieldId = `answer-body-${postId ?? reviewId ?? "new"}`;
  const url = reviewId
    ? ROUTES.communityReviewComments.replace("[id]", reviewId)
    : ROUTES.communityPostComments.replace("[id]", postId ?? "");
  const router = useRouter();
  const [body, setBody] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!agreed && !termsChecked) return setError("Agree to the Community rules first.");
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
    const result = await sendCommunity(url, "POST", { body });
    setPending(false);
    if (!result.ok) return setError(result.error.fields?.body ?? result.error.message);
    setBody("");
    router.refresh();
  }

  return (
    <form className="grid gap-2" noValidate onSubmit={submit}>
      <Field label={label} htmlFor={fieldId} hint="Other students see it without your name.">
        <Textarea id={fieldId} value={body} rows={3} maxLength={COMMENT_MAX} disabled={pending} onChange={(event) => setBody(event.target.value)} />
      </Field>
      {agreed ? null : <CommunityTerms checked={termsChecked} onChange={setTermsChecked} disabled={pending} />}
      <div><Button type="submit" disabled={pending || body.trim().length === 0} className="w-full sm:w-auto">{pending ? "Posting…" : submitLabel}</Button></div>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </form>
  );
}
