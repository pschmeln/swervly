"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { Button, Card, Field, TextInput } from "@/components/ui";
import { ROUTES } from "@/lib/constants";
import { readApiResponse } from "./api";

export function SetPasswordForm() {
  const { user } = useUser();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [replaced, setReplaced] = useState(false);
  const [pending, setPending] = useState(false);
  const saved = replaced || user?.passwordEnabled === true;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch(ROUTES.password, {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const payload = await response.json().catch(() => null);
      const parsed = readApiResponse<{ saved: boolean }>(payload);
      if (!response.ok || !parsed?.ok) {
        setError(parsed && !parsed.ok ? (parsed.error.fields?.password ?? parsed.error.message) : "Something went wrong.");
        return;
      }
      setReplaced(true);
      setPassword("");
      setConfirm("");
    } catch {
      setError("Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Set a password</h2>
      <p className="mt-1 text-neutral-700">
        Your first sign-in uses an emailed code. After you set a password, you can sign in with
        your email and password. On a new device, Clerk may still email a code once. That is
        Device Trust, also called Client Trust, and it protects a leaked password.
      </p>
      {saved ? <p className="mt-3 text-neutral-800">A password is set. You can replace it below.</p> : null}
      <form className="mt-4 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <Field label="New password" htmlFor="newPassword" error={error ?? undefined}>
          <TextInput
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={password}
            disabled={pending}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirmPassword">
          <TextInput
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirm}
            disabled={pending}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </Field>
        <Button type="submit" className="w-full sm:w-auto" disabled={pending || password.length < 8}>
          {pending ? "Saving…" : saved ? "Replace password" : "Set a password"}
        </Button>
      </form>
    </Card>
  );
}
