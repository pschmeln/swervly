"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { Button, Card, Field } from "@/components/ui";
import { PasswordInput } from "@/features/auth/components/password-input";
import {
  PASSWORD_HINT,
  PASSWORD_TOO_LONG_BYTES,
  utf8ByteLength,
} from "@/features/auth/password-messages";
import { ROUTES } from "@/lib/constants";
import { readApiResponse } from "./api";

export function SetPasswordForm() {
  const { user } = useUser();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [replaced, setReplaced] = useState(false);
  const [pending, setPending] = useState(false);
  const saved = replaced || user?.passwordEnabled === true;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setConfirmError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (utf8ByteLength(password) > 72) {
      setError(PASSWORD_TOO_LONG_BYTES);
      return;
    }
    if (password !== confirm) {
      setConfirmError("Those passwords don't match.");
      setError(null);
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
        After you set a password, you can sign in with your email and password on any device, without
        waiting for an emailed code.
      </p>
      {saved ? <p className="mt-3 text-neutral-800">A password is set. You can replace it below.</p> : null}
      <form className="mt-4 grid gap-4" onSubmit={(event) => void onSubmit(event)}>
        <Field
          label="New password"
          htmlFor="newPassword"
          hint={PASSWORD_HINT}
          error={error ?? undefined}
        >
          <PasswordInput
            id="newPassword"
            name="newPassword"
            value={password}
            disabled={pending}
            onChange={setPassword}
          />
        </Field>
        <Field
          label="Confirm password"
          htmlFor="confirmPassword"
          error={confirmError ?? undefined}
        >
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            value={confirm}
            disabled={pending}
            onChange={setConfirm}
          />
        </Field>
        <Button type="submit" className="w-full sm:w-auto" disabled={pending || password.length < 8}>
          {pending ? "Saving…" : saved ? "Replace password" : "Set a password"}
        </Button>
      </form>
    </Card>
  );
}
