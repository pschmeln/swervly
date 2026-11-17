"use client";

import { useState } from "react";
import { Button, Card, Field, Textarea } from "@/components/ui";
import { ROUTES } from "@/lib/constants";
import { readApiResponse } from "@/features/profile/components/api";

export function FeedbackForm({ page }: { page: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(ROUTES.feedbackApi, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ page, message }),
      });
      const payload = await response.json().catch(() => null);
      const parsed = readApiResponse<{ id: string }>(payload);
      if (!response.ok || !parsed?.ok) {
        setError(parsed && !parsed.ok ? (parsed.error.fields?.message ?? parsed.error.message) : "Something went wrong.");
        return;
      }
      setSaved(true);
      setMessage("");
    } catch {
      setError("Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (saved) {
    return (
      <Card>
        <h2 className="text-lg font-semibold">Thanks</h2>
        <p className="mt-1 text-neutral-700">We read every note.</p>
      </Card>
    );
  }

  return (
    <Card>
      <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label="What should we know?" htmlFor="feedbackMessage" error={error ?? undefined}>
          <Textarea
            id="feedbackMessage"
            name="message"
            value={message}
            maxLength={2000}
            disabled={pending}
            onChange={(event) => setMessage(event.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full sm:w-auto" disabled={pending || message.trim().length === 0}>
          {pending ? "Sending…" : "Send feedback"}
        </Button>
      </form>
    </Card>
  );
}
