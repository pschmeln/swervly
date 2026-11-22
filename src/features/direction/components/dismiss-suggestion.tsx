"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { ROUTES } from "@/lib/constants";

export function DismissSuggestion({
  roleType,
  onDismissed,
}: {
  roleType: string;
  /** Called after a successful save so the parent can update the list immediately. */
  onDismissed?: (roleType: string) => void;
}) {
  const [pending, setPending] = useState(false);

  async function dismiss() {
    if (pending) return;
    setPending(true);
    try {
      const response = await fetch(ROUTES.directionDismiss, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleType }),
      });
      if (response.ok) onDismissed?.(roleType);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={pending} onClick={() => void dismiss()}>
      {pending ? "Saving…" : "Not for me"}
    </Button>
  );
}
