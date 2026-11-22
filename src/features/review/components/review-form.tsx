"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { Button, ErrorNote, Field, LikertScale, Select, TextInput } from "@/components/ui";
import { PublicMajorSection } from "@/features/company/public-section";
import type { PublicMajorView } from "@/features/company/aggregate";
import { PlaceSearch } from "@/features/location/components/place-search";
import { apiFormBannerMessage, firstFieldControlId, readApiJson } from "@/features/review/components/api-client";
import { EmployerAutocomplete } from "@/features/review/components/employer-autocomplete";
import {
  clearedErrors,
  fieldError,
  initialForCreate,
  initialFromRotation,
  MAX_SKILLS,
  parsePay,
  previewBody,
  RATINGS,
  ROTATION_NUMBER_OPTIONS,
  rotationBody,
  TERM_SEASON_OPTIONS,
  YEAR_OPTIONS,
  type FieldErrors,
  type FormFields,
} from "@/features/review/components/review-form-model";
import { ReviewNote } from "@/features/review/components/review-note";
import { SkillsPicker } from "@/features/review/components/skills-picker";
import type { RotationListItem } from "@/features/review/components/types";
import { ROLE_TYPE_OPTIONS } from "@/features/review/roles";
import { WOULD_RETURN_OPTIONS } from "@/features/review/would-return";
import { ROUTES } from "@/lib/constants";

export function ReviewForm({
  mode,
  rotation,
  usedRotationNumbers = [],
  shareFreeTextDefault = false,
  majorSkills = [],
}: {
  mode: "create" | "edit";
  rotation?: RotationListItem;
  usedRotationNumbers?: number[];
  shareFreeTextDefault?: boolean;
  /** Skills for the student's major, shown first. Empty shows every skill. */
  majorSkills?: readonly string[];
}) {
  const router = useRouter();
  const editing = mode === "edit" && rotation ? rotation : null;
  const [form, setForm] = useState<FormFields>(() => (editing ? initialFromRotation(editing) : initialForCreate(usedRotationNumbers)));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ employerName: string; view: PublicMajorView } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const saveErrorRef = useRef<HTMLDivElement>(null);

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => clearedErrors(prev, key));
  }

  function setEmployer(employer: { id: string; name: string; city: string | null }) {
    setForm((prev) => ({ ...prev, employerId: employer.id, employerName: employer.name, employerCity: employer.city }));
    setFieldErrors((prev) => clearedErrors(prev, "employerId"));
  }

  /** Every change to the note goes through here, so the share checkbox follows the text. */
  function setNote(value: string) {
    const hadText = form.freeText.trim().length > 0;
    const hasText = value.trim().length > 0;
    update("freeText", value);
    if (!hasText) update("shareFreeText", false);
    else if (!hadText && shareFreeTextDefault) update("shareFreeText", true);
  }

  function toggleSkill(skill: string) {
    setForm((prev) => {
      if (prev.skillsUsed.includes(skill)) return { ...prev, skillsUsed: prev.skillsUsed.filter((item) => item !== skill) };
      if (prev.skillsUsed.length >= MAX_SKILLS) return prev;
      return { ...prev, skillsUsed: [...prev.skillsUsed, skill] };
    });
    setFieldErrors((prev) => clearedErrors(prev, "skillsUsed"));
  }

  function selectAddedSkill(skill: string) {
    setForm((prev) =>
      prev.skillsUsed.includes(skill) || prev.skillsUsed.length >= MAX_SKILLS ? prev : { ...prev, skillsUsed: [...prev.skillsUsed, skill] },
    );
  }

  /** Show the error banner, then scroll to and focus the first bad field (or the banner). */
  function presentSaveFailure(fields: FieldErrors, banner: string | undefined) {
    setFieldErrors(fields);
    setFormError(banner ?? Object.values(fields).find((value) => value.trim().length > 0) ?? "Could not save this co-op.");
    const controlId = firstFieldControlId(fields);
    window.setTimeout(() => {
      const field = controlId ? document.getElementById(controlId) : null;
      const alert = saveErrorRef.current;
      (field ?? alert)?.scrollIntoView({ block: "center" });
      if (field instanceof HTMLElement) field.focus({ preventScroll: true });
      else alert?.focus({ preventScroll: true });
    }, 0);
  }

  async function loadPreview() {
    const request = previewBody(form, editing?.id);
    if ("error" in request) {
      setPreviewError(request.error);
      setPreview(null);
      return;
    }
    setPreviewError(null);
    try {
      const response = await fetch(ROUTES.companyPreview, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request.body),
      });
      const result = await readApiJson<{ employerName: string; view: PublicMajorView }>(response);
      if (result.ok) {
        setPreview(result.data);
      } else {
        setPreviewError(result.error.message);
        setPreview(null);
      }
    } catch {
      setPreviewError("Could not build the preview.");
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setFormError(undefined);
    setFieldErrors({});

    const payHourly = parsePay(form.payHourly);
    if (payHourly !== undefined && !Number.isFinite(payHourly)) {
      presentSaveFailure({ payHourly: "Enter a valid hourly pay." }, "Enter a valid hourly pay.");
      return;
    }
    if (!form.employerId) {
      presentSaveFailure({ employerId: "Select or add an employer." }, "Select or add an employer.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(editing ? ROUTES.rotation.replace("[id]", editing.id) : ROUTES.rotations, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rotationBody(form, payHourly)),
      });
      const result = await readApiJson<unknown>(response);
      if (!result.ok) {
        presentSaveFailure(result.error.fields ?? {}, apiFormBannerMessage(result.error));
        return;
      }
      router.push(ROUTES.reviews);
      router.refresh();
    } catch {
      presentSaveFailure({}, "Could not save this co-op.");
    } finally {
      setSaving(false);
    }
  }

  const select = (key: keyof FormFields, label: string, options: readonly { value: string; label: string }[], extra: { placeholder?: string; hint?: string } = {}) => (
    <Field label={label} htmlFor={key} hint={extra.hint} error={fieldError(fieldErrors, key)}>
      <Select
        id={key}
        name={key}
        value={form[key] as string}
        disabled={saving}
        placeholder={extra.placeholder}
        options={options}
        onChange={(value) => update(key, value as never)}
      />
    </Field>
  );

  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => void onSubmit(e)} noValidate>
      <EmployerAutocomplete
        value={form.employerId ? { id: form.employerId, name: form.employerName, city: form.employerCity } : null}
        query={form.employerName}
        disabled={saving}
        error={fieldError(fieldErrors, "employerId", "name")}
        onQueryChange={(query) => setEmployer({ id: "", name: query, city: null })}
        onSelect={setEmployer}
      />

      <Field label="Role title" htmlFor="roleTitle" error={fieldError(fieldErrors, "roleTitle")}>
        <TextInput
          id="roleTitle"
          name="roleTitle"
          value={form.roleTitle}
          disabled={saving}
          maxLength={80}
          onChange={(event) => update("roleTitle", event.target.value)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {select("termSeason", "Term season", TERM_SEASON_OPTIONS, { placeholder: "Select season" })}
        {select("termYear", "Term year", YEAR_OPTIONS)}
      </div>

      {select("rotationNumber", "Co-op or internship number", ROTATION_NUMBER_OPTIONS, {
        hint: "If your school numbers co-op rotations, use that number. For summer internships, number them in the order you did them. You can save up to eight, and each number is used once.",
      })}

      <Field
        label="Hourly pay"
        htmlFor="payHourly"
        hint="Optional. Other students see pay only once 3 or more students in your major report it for this company, as the lowest and highest figures."
        error={fieldError(fieldErrors, "payHourly")}
      >
        <TextInput
          id="payHourly"
          name="payHourly"
          inputMode="decimal"
          value={form.payHourly}
          disabled={saving}
          placeholder="Optional"
          onChange={(event) => update("payHourly", event.target.value)}
        />
      </Field>

      <PlaceSearch
        id="workPlaceGeoid"
        label="Where did you work?"
        hint="Optional. The city of your office or site. Only you see it for now."
        value={form.workPlace}
        disabled={saving}
        error={fieldError(fieldErrors, "workPlaceGeoid")}
        onChange={(workPlace) => update("workPlace", workPlace)}
      />

      {select("roleType", "Role type", ROLE_TYPE_OPTIONS, { placeholder: "Select one" })}
      {select("wouldReturn", "Would you go back to this co-op?", WOULD_RETURN_OPTIONS, { placeholder: "Select one" })}

      {RATINGS.map((rating) => (
        <Field key={rating.key} label={rating.label} htmlFor={`${rating.key}-1`} error={fieldError(fieldErrors, rating.key, `review.${rating.key}`)}>
          <LikertScale name={rating.key} value={form[rating.key]} labels={rating.labels} onChange={(value) => update(rating.key, value)} />
        </Field>
      ))}

      <SkillsPicker
        employerId={form.employerId}
        selected={form.skillsUsed}
        majorSkills={majorSkills}
        disabled={saving}
        error={fieldError(fieldErrors, "skillsUsed", "review.skillsUsed")}
        onToggle={toggleSkill}
        onAdded={selectAddedSkill}
      />

      <ReviewNote
        value={form.freeText}
        shared={form.shareFreeText}
        disabled={saving}
        noteError={fieldError(fieldErrors, "freeText", "review.freeText")}
        shareError={fieldError(fieldErrors, "shareFreeText", "review.shareFreeText")}
        onNoteChange={setNote}
        onSharedChange={(shared) => update("shareFreeText", shared)}
      />

      {formError ? (
        <div
          ref={saveErrorRef}
          tabIndex={-1}
          className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <ErrorNote>{formError}</ErrorNote>
        </div>
      ) : null}

      <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={saving} onClick={() => void loadPreview()}>
        Preview what other students will see
      </Button>
      {previewError ? <ErrorNote>{previewError}</ErrorNote> : null}
      {preview ? <PublicMajorSection employerName={preview.employerName} view={preview.view} /> : null}

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Save co-op"}
      </Button>
    </form>
  );
}
