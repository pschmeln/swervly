"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Card, Checkbox, ErrorNote, Field, Select, Textarea, TextInput } from "@/components/ui";
import { MajorPicker } from "@/features/majors/components/major-picker";
import type { MajorSearchContext } from "@/features/majors/catalog";
import type { MajorPickerValue } from "@/features/majors/selection";
import { ROUTES } from "@/lib/constants";
import { sendJson } from "./api";
import { GOAL_OPTIONS, LOCATION_OPTIONS, YEAR_OPTIONS } from "./options";

export type ProfileEditorValues = {
  school: string;
  major: MajorPickerValue;
  exploringMajors: boolean;
  year: string;
  coopTrack: string;
  goal: string;
  goalNotes: string;
  locationConstraint: string;
  constraintsNotes: string;
};

export function ProfileEditor({
  initial,
  majorSearch,
}: {
  initial: ProfileEditorValues;
  majorSearch?: MajorSearchContext;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof ProfileEditorValues>(key: K, value: ProfileEditorValues[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    setFieldErrors({});
    const majorSelection =
      form.major.source === "undecided"
        ? { source: "undecided" as const }
        : form.major.source === "custom"
          ? { source: "custom" as const, name: form.major.name.trim() }
          : { source: "catalog" as const, name: form.major.name };
    const result = await sendJson(ROUTES.profileUpdate, "PUT", {
      school: form.school.trim(),
      year: Number(form.year),
      coopTrack: form.coopTrack.trim(),
      goal: form.goal,
      goalNotes: form.goalNotes.trim(),
      locationConstraint: form.locationConstraint,
      constraintsNotes: form.constraintsNotes.trim(),
      consentPrivacy: true,
      consentDataUse: true,
      majorSelection,
      exploringMajors: form.major.source === "undecided" ? false : form.exploringMajors,
    });
    setPending(false);
    if (!result.ok) {
      setFieldErrors(result.error.fields ?? {});
      setError(result.error.fields ? "Check the fields below and try again." : result.error.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={(event) => void onSubmit(event)}>
      <Card>
        <h2 className="text-lg font-semibold">Basics</h2>
        <div className="mt-4 grid gap-4">
          <Field label="School" htmlFor="school" error={fieldErrors.school}>
            <TextInput id="school" name="school" value={form.school} disabled={pending} onChange={(event) => update("school", event.target.value)} />
          </Field>
          <MajorPicker
            id="major"
            value={form.major}
            context={majorSearch}
            disabled={pending}
            error={fieldErrors.major}
            onChange={(value) => update("major", value)}
          />
          {form.major.source !== "undecided" ? (
            <Checkbox
              id="exploringMajors"
              name="exploringMajors"
              checked={form.exploringMajors}
              disabled={pending}
              onChange={(event) => update("exploringMajors", event.target.checked)}
              label="Show suggested majors too. Career direction stays available either way."
            />
          ) : null}
          <Field label="Year" htmlFor="year" error={fieldErrors.year}>
            <Select id="year" name="year" value={form.year} options={YEAR_OPTIONS} placeholder="Select your year" disabled={pending} onChange={(value) => update("year", value)} />
          </Field>
          <Field label="Co-op track" htmlFor="coopTrack" hint="Optional" error={fieldErrors.coopTrack}>
            <TextInput id="coopTrack" name="coopTrack" value={form.coopTrack} maxLength={40} disabled={pending} onChange={(event) => update("coopTrack", event.target.value)} />
          </Field>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">Goals</h2>
        <div className="mt-4 grid gap-4">
          <Field label="Goal" htmlFor="goal" error={fieldErrors.goal}>
            <Select id="goal" name="goal" value={form.goal} options={GOAL_OPTIONS} placeholder="Select a goal" disabled={pending} onChange={(value) => update("goal", value)} />
          </Field>
          <Field label="Goal notes" htmlFor="goalNotes" hint="Optional" error={fieldErrors.goalNotes}>
            <Textarea id="goalNotes" name="goalNotes" value={form.goalNotes} maxLength={500} disabled={pending} onChange={(event) => update("goalNotes", event.target.value)} />
          </Field>
          <Field label="Location constraint" htmlFor="locationConstraint" error={fieldErrors.locationConstraint}>
            <Select id="locationConstraint" name="locationConstraint" value={form.locationConstraint} options={LOCATION_OPTIONS} placeholder="Select a location constraint" disabled={pending} onChange={(value) => update("locationConstraint", value)} />
          </Field>
          <Field label="Other constraints" htmlFor="constraintsNotes" hint="Optional" error={fieldErrors.constraintsNotes}>
            <Textarea id="constraintsNotes" name="constraintsNotes" value={form.constraintsNotes} maxLength={500} disabled={pending} onChange={(event) => update("constraintsNotes", event.target.value)} />
          </Field>
        </div>
      </Card>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
      {saved ? <p className="text-neutral-800">Saved.</p> : null}
      <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
