"use client";

import { useEffect } from "react";
import { Button, ErrorNote, PageShell } from "@/components/ui";
import { errorDigest, reportClientError } from "@/lib/sentry";

export function ErrorFallback({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportClientError(error, window.location.pathname);
  }, [error]);

  const digest = errorDigest(error);

  return (
    <PageShell title="Something went wrong">
      <ErrorNote>
        Swervly hit an unexpected error. Try again, and if it keeps happening, email support@swervly.com.
      </ErrorNote>
      {digest ? <p className="text-sm text-neutral-600">Reference {digest}</p> : null}
      <div>
        <Button onClick={() => retry()}>Try again</Button>
      </div>
    </PageShell>
  );
}
