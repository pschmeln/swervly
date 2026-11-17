"use client";

import { useState } from "react";
import { Button, Card, ErrorNote, Select } from "@/components/ui";
import { readApiJson } from "@/features/review/components/api-client";
import { ROUTES } from "@/lib/constants";

type PendingMajor = { id: string; rawName: string };

export function MajorQueue({
  submissions,
  targets,
}: {
  submissions: PendingMajor[];
  targets: string[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [intoName, setIntoName] = useState<Record<string, string>>({});

  async function send(id: string, body: unknown) {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(ROUTES.foundersApi, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await readApiJson<{ id: string }>(response);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      window.location.reload();
    } catch {
      setError("Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Majors waiting</h2>
      <p className="mt-1 text-sm text-neutral-600">
        These names are private to the student who submitted them until you approve or merge them.
      </p>
      {error ? <div className="mt-2"><ErrorNote>{error}</ErrorNote></div> : null}
      {submissions.length === 0 ? <p className="mt-2 text-neutral-700">None waiting.</p> : null}
      <ul className="mt-3 grid gap-4">
        {submissions.map((submission) => (
          <li key={submission.id} className="grid gap-2 border-t border-neutral-200 pt-3">
            <p className="break-words font-medium">{submission.rawName}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="w-full sm:w-auto"
                disabled={busy === submission.id}
                onClick={() => void send(submission.id, { action: "approve", kind: "major", id: submission.id })}
              >
                Approve
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={busy === submission.id}
                onClick={() => void send(submission.id, { action: "reject", kind: "major", id: submission.id })}
              >
                Reject
              </Button>
            </div>
            <Select
              id={`major-into-${submission.id}`}
              value={intoName[submission.id] ?? ""}
              placeholder="Merge into…"
              options={targets.map((name) => ({ value: name, label: name }))}
              onChange={(value) => setIntoName((current) => ({ ...current, [submission.id]: value }))}
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={busy === submission.id || !intoName[submission.id]}
              onClick={() =>
                void send(submission.id, {
                  action: "merge",
                  kind: "major",
                  id: submission.id,
                  intoName: intoName[submission.id],
                })
              }
            >
              Merge into existing
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
