"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, ErrorNote } from "@/components/ui";
import { focusRing } from "@/components/ui/focus-ring";
import type { ModerationAction, QueueItem } from "@/features/community/moderation";
import { REPORT_REASON_LABELS, timeAgo } from "@/features/community/rules";
import { ROUTES } from "@/lib/constants";
import { sendCommunity } from "./api";

export const NO_REPORTS = "No open reports. Nothing to check right now.";
export const NO_HIDDEN = "Nothing is hidden.";
export const REMOVE_WARNING = "This deletes it for good, with its answers, Helpful marks and reports. It can't be undone.";

/** Founder-only Community queue: reported items first, then hidden ones that can be restored. */
export function ModerationQueue({ reported, hidden }: { reported: QueueItem[]; hidden: QueueItem[] }) {
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-semibold">Community reports</h2>
        <p className="mt-1 text-neutral-700">
          Reported posts and answers stay visible until you decide. Reporters and authors are never shown here.
        </p>
        {reported.length === 0 ? <p className="mt-3 text-neutral-700">{NO_REPORTS}</p> : null}
        <ul className="mt-3 grid gap-4">
          {reported.map((item) => (
            <QueueRow key={`${item.target}:${item.id}`} item={item} actions={["keep", "hide"]} />
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Hidden from students</h2>
        <p className="mt-1 text-neutral-700">Only founders can see these. Restore puts one back where it was.</p>
        {hidden.length === 0 ? <p className="mt-3 text-neutral-700">{NO_HIDDEN}</p> : null}
        <ul className="mt-3 grid gap-4">
          {hidden.map((item) => (
            <QueueRow key={`${item.target}:${item.id}`} item={item} actions={["restore"]} />
          ))}
        </ul>
      </Card>
    </div>
  );
}

const ACTION_LABELS: Record<ModerationAction, string> = {
  keep: "Keep visible",
  hide: "Hide",
  restore: "Restore",
  remove: "Remove for good",
};

function QueueRow({ item, actions }: { item: QueueItem; actions: ModerationAction[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function act(action: ModerationAction) {
    setBusy(true);
    setError(null);
    const result = await sendCommunity<{ id: string }>(ROUTES.foundersCommunityApi, "POST", {
      target: item.target,
      id: item.id,
      action,
      statusVersion: item.statusVersion,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setConfirmRemove(false);
    router.refresh();
  }

  const label = item.target === "post" ? "Post" : item.title ? `Answer to "${item.title}"` : "Comment";
  return (
    <li className="grid gap-2 border-t border-neutral-200 pt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
        <span className="break-words normal-case">{label}</span> · {timeAgo(item.createdAt)}
      </p>
      {item.target === "post" && item.title ? <p className="break-words font-medium">{item.title}</p> : null}
      {item.body ? <p className="whitespace-pre-line break-words text-neutral-800">{item.body}</p> : null}
      {item.reports.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Reports">
          {item.reports.map((report) => (
            <li key={report.reason} className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-800">
              {REPORT_REASON_LABELS[report.reason]} × {report.count}
            </li>
          ))}
        </ul>
      ) : null}
      {item.postId ? (
        <p>
          <Link href={`${ROUTES.community}/posts/${item.postId}`} className={`inline-flex min-h-12 items-center font-medium underline ${focusRing}`}>
            Read in context
          </Link>
        </p>
      ) : null}
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {confirmRemove ? (
        <div className="grid gap-2 rounded-xl border border-neutral-200 p-3">
          <p className="text-neutral-800">{REMOVE_WARNING}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" disabled={busy} onClick={() => void act("remove")}>
              Yes, remove for good
            </Button>
            <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={busy} onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          {actions.map((action) => (
            <Button key={action} type="button" variant={action === "keep" || action === "restore" ? "primary" : "secondary"}
              className="w-full sm:w-auto" disabled={busy} onClick={() => void act(action)}>
              {ACTION_LABELS[action]}
            </Button>
          ))}
          <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={busy} onClick={() => setConfirmRemove(true)}>
            {ACTION_LABELS.remove}
          </Button>
        </div>
      )}
    </li>
  );
}
