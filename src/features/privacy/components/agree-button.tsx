"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorNote } from "@/components/ui";
import { readApiJson } from "@/features/review/components/api-client";
import { ROUTES } from "@/lib/constants";

export function AgreeButton({ version }: { version: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(ROUTES.privacyAgree, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ version }),
      });
      const result = await readApiJson<{ agreed: true }>(response);
      if (!result.ok) {
        setError(result.error.message);
        setPending(false);
        return;
      }
      router.replace(ROUTES.home);
      router.refresh();
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-2">
      <Button onClick={agree} disabled={pending} className="w-full sm:w-auto">
        {pending ? "Saving…" : "I agree, continue"}
      </Button>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </div>
  );
}
