"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorNote, Field, Select, Textarea, TextInput } from "@/components/ui";
import { BODY_MAX, COMMUNITY_AREA_OPTIONS, COMMUNITY_ROLE_OPTIONS, COMMUNITY_TERMS_VERSION, TITLE_MAX } from "@/features/community/rules";
import { ROUTES } from "@/lib/constants";
import { sendCommunity } from "./api";
import { CommunityTerms } from "./terms";

export const TERMS_NEEDED = "Agree to the Community rules to post.";

/** Ask a question or share advice (item 14). Visible to other students at once, without a name. */
export function PostComposer({
  employers,
  agreed,
  defaultArea,
}: {
  employers: readonly { id: string; name: string }[];
  agreed: boolean;
  defaultArea: string | null;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"question" | "advice">("question");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [employerId, setEmployerId] = useState("");
  const [roleType, setRoleType] = useState("");
  const [area, setArea] = useState(defaultArea ?? "");
  const [termsChecked, setTermsChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (!agreed && !termsChecked) {
      setError(TERMS_NEEDED);
      return;
    }
    setPending(true);
    setError(null);
    setFields({});
    if (!agreed) {
      const terms = await sendCommunity(ROUTES.communityTerms, "POST", { version: COMMUNITY_TERMS_VERSION });
      if (!terms.ok) {
        setError(terms.error.message);
        setPending(false);
        return;
      }
    }
    const result = await sendCommunity<{ id: string }>(ROUTES.communityPosts, "POST", {
      kind,
      title,
      body,
      employerId: employerId || null,
      roleType: roleType || null,
      atlasFamily: area || null,
    });
    if (!result.ok) {
      setError(result.error.message);
      setFields(result.error.fields ?? {});
      setPending(false);
      return;
    }
    router.push(ROUTES.communityPost.replace("[id]", result.data.id));
  }

  return (
    <Card>
      <form className="grid gap-3" noValidate onSubmit={submit}>
        <h2 className="text-lg font-semibold">Post to Community</h2>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Kind of post</legend>
          {(["question", "advice"] as const).map((value) => (
            <Button key={value} type="button" variant={kind === value ? "primary" : "secondary"} aria-pressed={kind === value} onClick={() => setKind(value)}>
              {value === "question" ? "Ask a question" : "Share advice"}
            </Button>
          ))}
        </fieldset>
        <Field label="Title" htmlFor="post-title" error={fields.title}>
          <TextInput id="post-title" value={title} maxLength={TITLE_MAX} disabled={pending} onChange={(event) => setTitle(event.target.value)}
            placeholder={kind === "question" ? "What do you want to know?" : "What should other students know?"} />
        </Field>
        <Field label={kind === "question" ? "Details" : "Your advice"} htmlFor="post-body" hint={kind === "question" ? "Optional" : undefined} error={fields.body}>
          <Textarea id="post-body" value={body} maxLength={BODY_MAX} rows={4} disabled={pending} onChange={(event) => setBody(event.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Company" htmlFor="post-company" hint="Optional" error={fields.employerId}>
            <Select id="post-company" value={employerId} onChange={setEmployerId} disabled={pending}
              options={[{ value: "", label: "No company" }, ...employers.map((employer) => ({ value: employer.id, label: employer.name }))]} />
          </Field>
          <Field label="Role" htmlFor="post-role" hint="Optional" error={fields.roleType}>
            <Select id="post-role" value={roleType} onChange={setRoleType} disabled={pending} options={[{ value: "", label: "No role" }, ...COMMUNITY_ROLE_OPTIONS]} />
          </Field>
          <Field label="Career area" htmlFor="post-area" hint="Optional" error={fields.atlasFamily}>
            <Select id="post-area" value={area} onChange={setArea} disabled={pending} options={[{ value: "", label: "No area" }, ...COMMUNITY_AREA_OPTIONS]} />
          </Field>
        </div>
        {agreed ? null : <CommunityTerms checked={termsChecked} onChange={setTermsChecked} disabled={pending} />}
        <p className="text-sm text-neutral-600">Other students see your post without your name. You can edit for 15 minutes and delete any time.</p>
        <div>
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">{pending ? "Posting…" : "Post"}</Button>
        </div>
        {error ? <ErrorNote>{error}</ErrorNote> : null}
      </form>
    </Card>
  );
}
