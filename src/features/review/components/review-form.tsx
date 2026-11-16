"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import {
  Button,
  Checkbox,
  ErrorNote,
  Field,
  LikertScale,
  Select,
  TextInput,
  Textarea,
} from "@/components/ui";
import { SKILLS, type Skill } from "@/content/skills";
import { ROUTES } from "@/lib/constants";
import {
  apiFormBannerMessage,
  firstFieldControlId,
  readApiJson,
} from "@/features/review/components/api-client";
import {
  EmployerAutocomplete,
  type EmployerOption,
} from "@/features/review/components/employer-autocomplete";
import type { RotationListItem } from "@/features/review/components/types";

const CURRENT_YEAR = new Date().getFullYear();

const TERM_SEASON_OPTIONS = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
] as const;

const YEAR_OPTIONS = Array.from(
  { length: CURRENT_YEAR - 2015 + 1 },
  (_, index) => {
    const year = CURRENT_YEAR - index;
    return { value: String(year), label: String(year) };
  },
);

const ROTATION_NUMBER_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({
  value: String(n),
  label: String(n),
}));

const RETURN_OFFER_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
  { value: "pending", label: "Don't know yet" },
  { value: "not_applicable", label: "Not applicable" },
] as const;

const ENJOYMENT_LABELS = [
  "Not at all",
  "Slightly",
  "Somewhat",
  "A lot",
  "Loved it",
] as const;

const LEARNING_LABELS = [
  "Very little",
  "A little",
  "Some",
  "A lot",
  "A great deal",
] as const;

const MENTORSHIP_LABELS = [
  "None",
  "Poor",
  "Fair",
  "Good",
  "Excellent",
] as const;

const CLARITY_LABELS = [
  "Not at all",
  "Slightly",
  "Somewhat",
  "Clearer",
  "Much clearer",
] as const;

type FormFields = {
  employerId: string;
  employerName: string;
  employerCity: string | null;
  roleTitle: string;
  termSeason: string;
  termYear: string;
  rotationNumber: string;
  payHourly: string;
  returnOffer: string;
  enjoyment: number | null;
  learning: number | null;
  mentorship: number | null;
  clarityGained: number | null;
  skillsUsed: Skill[];
  freeText: string;
  shareFreeText: boolean;
};

type FieldErrors = Record<string, string>;

function lowestUnusedRotationNumber(used: number[]): number {
  for (const n of [1, 2, 3, 4, 5]) {
    if (!used.includes(n)) return n;
  }
  return 1;
}

function initialFromRotation(rotation: RotationListItem): FormFields {
  return {
    employerId: rotation.employer.id,
    employerName: rotation.employer.name,
    employerCity: null,
    roleTitle: rotation.roleTitle,
    termSeason: rotation.termSeason,
    termYear: String(rotation.termYear),
    rotationNumber: String(rotation.rotationNumber),
    payHourly: rotation.payHourly ?? "",
    returnOffer: rotation.returnOffer,
    enjoyment: rotation.review.enjoyment,
    learning: rotation.review.learning,
    mentorship: rotation.review.mentorship,
    clarityGained: rotation.review.clarityGained,
    skillsUsed: rotation.review.skillsUsed.filter((skill): skill is Skill =>
      (SKILLS as readonly string[]).includes(skill),
    ),
    freeText: rotation.review.freeText ?? "",
    shareFreeText: rotation.review.shareFreeText,
  };
}

function initialForCreate(usedRotationNumbers: number[]): FormFields {
  return {
    employerId: "",
    employerName: "",
    employerCity: null,
    roleTitle: "",
    termSeason: "",
    termYear: String(CURRENT_YEAR),
    rotationNumber: String(lowestUnusedRotationNumber(usedRotationNumbers)),
    payHourly: "",
    returnOffer: "",
    enjoyment: null,
    learning: null,
    mentorship: null,
    clarityGained: null,
    skillsUsed: [],
    freeText: "",
    shareFreeText: false,
  };
}

function fieldError(
  fields: FieldErrors | undefined,
  ...keys: string[]
): string | undefined {
  if (!fields) return undefined;
  for (const key of keys) {
    if (fields[key]) return fields[key];
  }
  return undefined;
}

export function ReviewForm({
  mode,
  rotation,
  usedRotationNumbers = [],
}: {
  mode: "create" | "edit";
  rotation?: RotationListItem;
  usedRotationNumbers?: number[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>(() =>
    mode === "edit" && rotation
      ? initialFromRotation(rotation)
      : initialForCreate(usedRotationNumbers),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const saveErrorRef = useRef<HTMLDivElement>(null);

  function presentSaveFailure(fields: FieldErrors, banner: string | undefined) {
    const message =
      banner ??
      Object.values(fields).find((value) => value.trim().length > 0) ??
      "Could not save this co-op.";
    setFieldErrors(fields);
    setFormError(message);
    const controlId = firstFieldControlId(fields);
    window.setTimeout(() => {
      const field = controlId ? document.getElementById(controlId) : null;
      const alert = saveErrorRef.current;
      const target = field ?? alert;
      target?.scrollIntoView({ block: "center" });
      if (field instanceof HTMLElement) {
        field.focus({ preventScroll: true });
      } else {
        alert?.focus({ preventScroll: true });
      }
    }, 0);
  }

  const selectedEmployer: EmployerOption | null = form.employerId
    ? {
        id: form.employerId,
        name: form.employerName,
        city: form.employerCity,
      }
    : null;

  function update<K extends keyof FormFields>(key: K, value: FormFields[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      if (key === "employerId" || key === "employerName") {
        delete next.employerId;
        delete next.name;
      }
      if (key.startsWith("review.") || ["enjoyment", "learning", "mentorship", "clarityGained", "skillsUsed", "freeText", "shareFreeText"].includes(key)) {
        delete next[`review.${key}`];
      }
      return next;
    });
  }

  function toggleSkill(skill: Skill) {
    setForm((prev) => {
      const exists = prev.skillsUsed.includes(skill);
      if (exists) {
        return {
          ...prev,
          skillsUsed: prev.skillsUsed.filter((item) => item !== skill),
        };
      }
      if (prev.skillsUsed.length >= 10) return prev;
      return { ...prev, skillsUsed: [...prev.skillsUsed, skill] };
    });
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next.skillsUsed;
      delete next["review.skillsUsed"];
      return next;
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFormError(undefined);
    setFieldErrors({});

    const payTrimmed = form.payHourly.trim();
    let payHourly: number | undefined;
    if (payTrimmed !== "") {
      const parsed = Number(payTrimmed);
      if (!Number.isFinite(parsed)) {
        presentSaveFailure(
          { payHourly: "Enter a valid hourly pay." },
          "Enter a valid hourly pay.",
        );
        setSaving(false);
        return;
      }
      payHourly = parsed;
    }

    if (!form.employerId) {
      presentSaveFailure(
        { employerId: "Select or add an employer." },
        "Select or add an employer.",
      );
      setSaving(false);
      return;
    }

    const body = {
      employerId: form.employerId,
      roleTitle: form.roleTitle.trim(),
      termSeason: form.termSeason,
      termYear: Number(form.termYear),
      rotationNumber: Number(form.rotationNumber),
      ...(payHourly !== undefined ? { payHourly } : {}),
      returnOffer: form.returnOffer,
      review: {
        enjoyment: form.enjoyment,
        learning: form.learning,
        mentorship: form.mentorship,
        clarityGained: form.clarityGained,
        skillsUsed: form.skillsUsed,
        ...(form.freeText.trim() !== ""
          ? { freeText: form.freeText.trim() }
          : {}),
        shareFreeText: form.shareFreeText,
      },
    };

    try {
      const url =
        mode === "edit" && rotation
          ? ROUTES.rotation.replace("[id]", rotation.id)
          : ROUTES.rotations;
      const response = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await readApiJson<unknown>(response);
      if (!result.ok) {
        presentSaveFailure(
          result.error.fields ?? {},
          apiFormBannerMessage(result.error),
        );
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

  return (
    <form className="flex flex-col gap-5" onSubmit={(e) => void onSubmit(e)} noValidate>
      <EmployerAutocomplete
        value={selectedEmployer}
        query={form.employerName}
        disabled={saving}
        error={fieldError(fieldErrors, "employerId", "name")}
        onQueryChange={(query) => {
          setForm((prev) => ({
            ...prev,
            employerName: query,
            employerId: "",
            employerCity: null,
          }));
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.employerId;
            delete next.name;
            return next;
          });
        }}
        onSelect={(employer) => {
          setForm((prev) => ({
            ...prev,
            employerId: employer.id,
            employerName: employer.name,
            employerCity: employer.city,
          }));
          setFieldErrors((prev) => {
            const next = { ...prev };
            delete next.employerId;
            delete next.name;
            return next;
          });
        }}
      />

      <Field
        label="Role title"
        htmlFor="roleTitle"
        error={fieldError(fieldErrors, "roleTitle")}
      >
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
        <Field
          label="Term season"
          htmlFor="termSeason"
          error={fieldError(fieldErrors, "termSeason")}
        >
          <Select
            id="termSeason"
            name="termSeason"
            value={form.termSeason}
            disabled={saving}
            placeholder="Select season"
            options={TERM_SEASON_OPTIONS}
            onChange={(value) => update("termSeason", value)}
          />
        </Field>
        <Field
          label="Term year"
          htmlFor="termYear"
          error={fieldError(fieldErrors, "termYear")}
        >
          <Select
            id="termYear"
            name="termYear"
            value={form.termYear}
            disabled={saving}
            options={YEAR_OPTIONS}
            onChange={(value) => update("termYear", value)}
          />
        </Field>
      </div>

      <Field
        label="Rotation number"
        htmlFor="rotationNumber"
        error={fieldError(fieldErrors, "rotationNumber")}
      >
        <Select
          id="rotationNumber"
          name="rotationNumber"
          value={form.rotationNumber}
          disabled={saving}
          options={ROTATION_NUMBER_OPTIONS}
          onChange={(value) => update("rotationNumber", value)}
        />
      </Field>

      <Field
        label="Hourly pay"
        htmlFor="payHourly"
        hint="Optional. Only ever shown as a range across three or more students, never on its own."
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

      <Field
        label="Return offer"
        htmlFor="returnOffer"
        error={fieldError(fieldErrors, "returnOffer")}
      >
        <Select
          id="returnOffer"
          name="returnOffer"
          value={form.returnOffer}
          disabled={saving}
          placeholder="Select one"
          options={RETURN_OFFER_OPTIONS}
          onChange={(value) => update("returnOffer", value)}
        />
      </Field>

      <Field
        label="How much did you enjoy the work?"
        htmlFor="enjoyment-1"
        error={fieldError(fieldErrors, "enjoyment", "review.enjoyment")}
      >
        <LikertScale
          name="enjoyment"
          value={form.enjoyment}
          labels={ENJOYMENT_LABELS}
          onChange={(value) => update("enjoyment", value)}
        />
      </Field>

      <Field
        label="How much did you learn?"
        htmlFor="learning-1"
        error={fieldError(fieldErrors, "learning", "review.learning")}
      >
        <LikertScale
          name="learning"
          value={form.learning}
          labels={LEARNING_LABELS}
          onChange={(value) => update("learning", value)}
        />
      </Field>

      <Field
        label="How good was the mentorship?"
        htmlFor="mentorship-1"
        error={fieldError(fieldErrors, "mentorship", "review.mentorship")}
      >
        <LikertScale
          name="mentorship"
          value={form.mentorship}
          labels={MENTORSHIP_LABELS}
          onChange={(value) => update("mentorship", value)}
        />
      </Field>

      <Field
        label="Did this co-op make it clearer what you want next?"
        htmlFor="clarityGained-1"
        error={fieldError(fieldErrors, "clarityGained", "review.clarityGained")}
      >
        <LikertScale
          name="clarityGained"
          value={form.clarityGained}
          labels={CLARITY_LABELS}
          onChange={(value) => update("clarityGained", value)}
        />
      </Field>

      <div
        id="skills-used"
        tabIndex={-1}
        aria-label="Skills used"
        className="flex flex-col gap-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
      >
        <p className="text-sm font-medium text-neutral-900">Skills used</p>
        <p className="text-sm text-neutral-600">Pick up to 10.</p>
        <div className="flex flex-wrap gap-2">
          {SKILLS.map((skill) => {
            const selected = form.skillsUsed.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                disabled={saving || (!selected && form.skillsUsed.length >= 10)}
                aria-pressed={selected}
                className={`min-h-12 rounded-lg border px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                  selected
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50"
                }`}
                onClick={() => toggleSkill(skill)}
              >
                {skill}
              </button>
            );
          })}
        </div>
        {fieldError(fieldErrors, "skillsUsed", "review.skillsUsed") ? (
          <ErrorNote>
            {fieldError(fieldErrors, "skillsUsed", "review.skillsUsed")}
          </ErrorNote>
        ) : null}
      </div>

      <Field
        label="Anything a student considering this co-op should know?"
        htmlFor="freeText"
        error={fieldError(fieldErrors, "freeText", "review.freeText")}
      >
        <Textarea
          id="freeText"
          name="freeText"
          value={form.freeText}
          disabled={saving}
          maxLength={2000}
          onChange={(event) => update("freeText", event.target.value)}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <Checkbox
          id="shareFreeText"
          name="shareFreeText"
          label="It's OK to show this text to other UC students without my name."
          checked={form.shareFreeText}
          disabled={saving}
          onChange={(event) => update("shareFreeText", event.target.checked)}
        />
        {fieldError(fieldErrors, "shareFreeText", "review.shareFreeText") ? (
          <ErrorNote>
            {fieldError(fieldErrors, "shareFreeText", "review.shareFreeText")}
          </ErrorNote>
        ) : null}
      </div>

      {formError ? (
        <div
          ref={saveErrorRef}
          tabIndex={-1}
          className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
        >
          <ErrorNote>{formError}</ErrorNote>
        </div>
      ) : null}

      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Save co-op"}
      </Button>
    </form>
  );
}
