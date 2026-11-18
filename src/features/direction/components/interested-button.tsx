"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui";
import { ROUTES } from "@/lib/constants";

/** Toggle a career as Interested. Shows the saved state and survives a failed save. */
export function InterestedButton({ roleType, initial }: { roleType: string; initial: boolean }) {
  const router = useRouter();
  const [interested, setInterested] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    if (pending) return;
    const next = !interested;
    setPending(true);
    setError(false);
    setInterested(next);
    try {
      const response = await fetch(ROUTES.directionInterest, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleType, interested: next }),
      });
      if (!response.ok) throw new Error("save failed");
      router.refresh();
    } catch {
      setInterested(!next);
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <Button
        type="button"
        variant={interested ? "primary" : "secondary"}
        aria-pressed={interested}
        className="w-full whitespace-nowrap sm:w-auto"
        disabled={pending}
        onClick={() => void toggle()}
      >
        {interested ? "✓ Interested" : "Interested"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          Couldn&apos;t save that. Try again.
        </p>
      ) : null}
    </div>
  );
}
