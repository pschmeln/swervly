"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote, Field, Select, Textarea, TextInput } from "@/components/ui";
import { COMMENT_MAX, COMMUNITY_TERMS_VERSION, REPORT_REASON_LABELS, REPORT_REASONS, TITLE_MAX, BODY_MAX } from "@/features/community/rules";
import { ROUTES } from "@/lib/constants";
import { sendCommunity } from "./api";
import { CommunityTerms } from "./terms";

type Target = "post" | "comment";

/** Helpful, Report, and for the author Edit (15 minutes) and Delete, on a post or an answer. */
export function ItemActions({
  target,
  id,
  helpfulCount,
  helpedByMe,
  mine,
  canEdit,
  agreed,
  title,
  body,
  afterDelete,
  commentNoun = "answer",
  titleEditable = true,
}: {
  target: Target;
  id: string;
  helpfulCount: number;
  helpedByMe: boolean;
  mine: boolean;
  canEdit: boolean;
  agreed: boolean;
  title?: string;
  body: string;
  afterDelete?: string;
  /** What a comment is called where it appears: an answer on a post, a comment on a review note. */
  commentNoun?: "answer" | "comment";
  /** A shared work-style card keeps its archetype name; only its line can be edited. */
  titleEditable?: boolean;
}) {
  const router = useRouter();
  const [helped, setHelped] = useState(helpedByMe);
  const [count, setCount] = useState(helpfulCount);
  const [mode, setMode] = useState<"idle" | "report" | "edit" | "delete">("idle");
  const [reason, setReason] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [editTitle, setEditTitle] = useState(title ?? "");
  const [editBody, setEditBody] = useState(body);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const noun = target === "post" ? "post" : "answer";

  async function toggleHelpful() {
    if (pending) return;
    setPending(true);
    setError(null);
    const next = !helped;
    const result = await sendCommunity(ROUTES.communityHelpful, "PUT", { target, id, on: next });
    if (result.ok) {
      setHelped(next);
      setCount((value) => value + (next ? 1 : -1));
    } else {
      setError(result.error.message);
    }
    setPending(false);
  }

  async function report() {
    if (pending) return;
    if (!reason) return setError("Choose a reason.");
    if (!agreed && !termsChecked) return setError("Agree to the Community rules to report.");
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
    const result = await sendCommunity(ROUTES.communityReports, "POST", { target, id, reason });
    setPending(false);
    if (!result.ok) return setError(result.error.message);
    setMode("idle");
    setNotice(`Reported. The founders will look at this ${noun}.`);
  }

  async function saveEdit() {
    if (pending) return;
    setPending(true);
    setError(null);
    const url = target === "post" ? ROUTES.communityPostApi.replace("[id]", id) : ROUTES.communityCommentApi.replace("[id]", id);
    const result = await sendCommunity(url, "PATCH", target === "post" ? { title: editTitle, body: editBody } : { body: editBody });
    setPending(false);
    if (!result.ok) return setError(result.error.message);
    setMode("idle");
    router.refresh();
  }

  async function remove() {
    if (pending) return;
    setPending(true);
    setError(null);
    const url = target === "post" ? ROUTES.communityPostApi.replace("[id]", id) : ROUTES.communityCommentApi.replace("[id]", id);
    const result = await sendCommunity(url, "DELETE");
    setPending(false);
    if (!result.ok) return setError(result.error.message);
    if (afterDelete) router.push(afterDelete);
    else router.refresh();
  }

  return (
    <div className="mt-3 grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button variant={helped ? "primary" : "secondary"} aria-pressed={helped} disabled={pending} onClick={toggleHelpful}>
          Helpful · {count}
        </Button>
        {mine ? null : (
          <Button variant="secondary" disabled={pending} aria-expanded={mode === "report"} onClick={() => setMode(mode === "report" ? "idle" : "report")}>
            Report
          </Button>
        )}
        {mine && canEdit ? (
          <Button variant="secondary" disabled={pending} aria-expanded={mode === "edit"} onClick={() => setMode(mode === "edit" ? "idle" : "edit")}>
            Edit
          </Button>
        ) : null}
        {mine ? (
          <Button variant="secondary" disabled={pending} aria-expanded={mode === "delete"} onClick={() => setMode(mode === "delete" ? "idle" : "delete")}>
            Delete
          </Button>
        ) : null}
      </div>

      {mode === "report" ? (
        <div className="grid gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
          <Field label={`Why are you reporting this ${noun}?`} htmlFor={`report-${id}`}>
            <Select id={`report-${id}`} value={reason} onChange={setReason} placeholder="Choose a reason"
              options={REPORT_REASONS.map((value) => ({ value, label: REPORT_REASON_LABELS[value] }))} />
          </Field>
          {agreed ? null : <CommunityTerms checked={termsChecked} onChange={setTermsChecked} disabled={pending} />}
          <div><Button disabled={pending} onClick={report} className="w-full sm:w-auto">Send report</Button></div>
        </div>
      ) : null}

      {mode === "edit" ? (
        <div className="grid gap-2 rounded-2xl border border-neutral-200 bg-white p-3">
          {target === "post" && titleEditable ? (
            <Field label="Title" htmlFor={`edit-title-${id}`}>
              <TextInput id={`edit-title-${id}`} value={editTitle} maxLength={TITLE_MAX} onChange={(event) => setEditTitle(event.target.value)} />
            </Field>
          ) : null}
          <Field label={target === "post" ? (titleEditable ? "Details" : "Your line") : commentNoun === "comment" ? "Comment" : "Answer"} htmlFor={`edit-body-${id}`}>
            <Textarea id={`edit-body-${id}`} value={editBody} rows={4} maxLength={target === "post" ? BODY_MAX : COMMENT_MAX} onChange={(event) => setEditBody(event.target.value)} />
          </Field>
          <div><Button disabled={pending} onClick={saveEdit} className="w-full sm:w-auto">Save changes</Button></div>
        </div>
      ) : null}

      {mode === "delete" ? (
        <div className="grid gap-2 rounded-2xl border border-red-200 bg-white p-3">
          <p className="text-neutral-800">
            {target === "post"
              ? "Delete this post? If other students answered it, their answers stay and your post is erased."
              : `Delete this ${commentNoun}? This can't be undone.`}
          </p>
          <div><Button disabled={pending} onClick={remove} className="w-full sm:w-auto">Delete {noun}</Button></div>
        </div>
      ) : null}

      {notice ? <p role="status" className="text-sm text-neutral-700">{notice}</p> : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </div>
  );
}
