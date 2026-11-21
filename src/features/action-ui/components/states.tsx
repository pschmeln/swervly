"use client";

import { Button, ErrorNote } from "@/components/ui";
import { ACTION_UNAVAILABLE_MESSAGE } from "@/features/action-ui/view";
import type { SaveNotice } from "@/features/action-ui/types";

export function LoadingState() {
  return <p className="text-ink-2">Loading…</p>;
}

export function UnavailableState({ message = ACTION_UNAVAILABLE_MESSAGE, onRetry }: { message?: string; onRetry: () => void }) {
  return (
    <div role="alert" className="glass rounded-[22px] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Action is not available yet</h2>
      <p className="mt-2 text-ink-2">{message}</p>
      <Button onClick={onRetry} className="mt-4 w-full sm:w-auto">
        Retry
      </Button>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="glass rounded-[22px] p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-ink">Action didn’t load</h2>
      <p className="mt-2 text-ink-2">{message}</p>
      <Button onClick={onRetry} className="mt-4 w-full sm:w-auto">
        Retry
      </Button>
    </div>
  );
}

export function SaveStatus({ notice, onRetry }: { notice: SaveNotice; onRetry: () => void }) {
  const live = notice.status === "saving" ? "Saving…" : notice.status === "saved" ? "Saved." : "";
  return (
    <div className="grid gap-2">
      {live ? (
        <p role="status" aria-live="polite" className="text-sm font-semibold text-ink">
          {live}
        </p>
      ) : null}
      {notice.status === "error" ? (
        <div role="alert" tabIndex={-1} className="grid gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <ErrorNote>{notice.message}</ErrorNote>
          <Button onClick={onRetry} className="w-full sm:w-auto">
            Retry
          </Button>
        </div>
      ) : null}
    </div>
  );
}
