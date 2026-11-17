"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { ROUTES } from "@/lib/constants";

export function DismissSuggestion({ roleType }: { roleType: string }) {
  const router = useRouter();
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
      if (response.ok) router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="secondary" className="mt-3 w-full sm:w-auto" disabled={pending} onClick={() => void dismiss()}>
      {pending ? "Saving…" : "Not for me"}
    </Button>
  );
}
