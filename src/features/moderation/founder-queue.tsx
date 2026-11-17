"use client";

import { useState } from "react";
import { Button, Card, ErrorNote, Select } from "@/components/ui";
import { ROUTES } from "@/lib/constants";
import { readApiJson } from "@/features/review/components/api-client";

type PendingSkill = { id: string; name: string; kind: string };
type PendingEmployer = { id: string; name: string; city: string | null };

export function FounderQueue({
  skills,
  employers,
  skillTargets,
  employerTargets,
}: {
  skills: PendingSkill[];
  employers: PendingEmployer[];
  skillTargets: string[];
  employerTargets: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [skillInto, setSkillInto] = useState<Record<string, string>>({});
  const [employerInto, setEmployerInto] = useState<Record<string, string>>({});

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
    <div className="grid gap-4">
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      <Card>
        <h2 className="text-lg font-semibold">Skills waiting</h2>
        {skills.length === 0 ? <p className="mt-2 text-neutral-700">None waiting.</p> : null}
        <ul className="mt-3 grid gap-4">
          {skills.map((skill) => (
            <li key={skill.id} className="grid gap-2 border-t border-neutral-200 pt-3">
              <p className="break-words font-medium">
                {skill.name}{" "}
                <span className="font-normal text-neutral-600">
                  ({skill.kind === "non_technical" ? "non-technical" : "technical"})
                </span>
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="w-full sm:w-auto" disabled={busy === skill.id} onClick={() => void send(skill.id, { action: "approve", kind: "skill", id: skill.id })}>
                  Approve
                </Button>
                <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={busy === skill.id} onClick={() => void send(skill.id, { action: "reject", kind: "skill", id: skill.id })}>
                  Reject
                </Button>
              </div>
              <Select
                id={`skill-into-${skill.id}`}
                value={skillInto[skill.id] ?? ""}
                placeholder="Merge into…"
                options={skillTargets.filter((name) => name !== skill.name).map((name) => ({ value: name, label: name }))}
                onChange={(value) => setSkillInto((current) => ({ ...current, [skill.id]: value }))}
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={busy === skill.id || !skillInto[skill.id]}
                onClick={() => void send(skill.id, { action: "merge", kind: "skill", id: skill.id, intoName: skillInto[skill.id] })}
              >
                Merge into existing
              </Button>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Companies waiting</h2>
        {employers.length === 0 ? <p className="mt-2 text-neutral-700">None waiting.</p> : null}
        <ul className="mt-3 grid gap-4">
          {employers.map((employer) => (
            <li key={employer.id} className="grid gap-2 border-t border-neutral-200 pt-3">
              <p className="break-words font-medium">
                {employer.name}
                {employer.city ? <span className="font-normal text-neutral-600"> · {employer.city}</span> : null}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" className="w-full sm:w-auto" disabled={busy === employer.id} onClick={() => void send(employer.id, { action: "approve", kind: "employer", id: employer.id })}>
                  Approve
                </Button>
                <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={busy === employer.id} onClick={() => void send(employer.id, { action: "reject", kind: "employer", id: employer.id })}>
                  Reject
                </Button>
              </div>
              <Select
                id={`employer-into-${employer.id}`}
                value={employerInto[employer.id] ?? ""}
                placeholder="Merge into…"
                options={employerTargets.map((target) => ({ value: target.id, label: target.name }))}
                onChange={(value) => setEmployerInto((current) => ({ ...current, [employer.id]: value }))}
              />
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={busy === employer.id || !employerInto[employer.id]}
                onClick={() => void send(employer.id, { action: "merge", kind: "employer", id: employer.id, intoId: employerInto[employer.id] })}
              >
                Merge into existing
              </Button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
