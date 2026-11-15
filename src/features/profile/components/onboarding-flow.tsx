"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { ZodError } from "zod";
import {
  Button,
  Card,
  Checkbox,
  ErrorNote,
  Field,
  LikertScale,
  Select,
  Textarea,
  TextInput,
} from "@/components/ui";
import { ATTRIBUTION, INSTRUMENT, INTEREST_ITEMS, RESPONSE_LABELS } from "@/content/interest-items";
import { AssessmentInput, ProfileInput } from "@/features/profile/schemas";
import { ROUTES } from "@/lib/constants";
import { sendJson } from "./api";
import { GOAL_OPTIONS, LOCATION_OPTIONS, MAJOR_OPTIONS, YEAR_OPTIONS } from "./options";

const PAGE_SIZE = 6;
const PAGE_COUNT = Math.ceil(INTEREST_ITEMS.length / PAGE_SIZE);

const FIELD_COPY: Record<string, string> = {
  consentPrivacy: "Confirm that you have read the Privacy Policy.",
  consentDataUse:
    "Confirm that your answers and co-op reviews may be stored and used as described.",
  major: "Select your major.",
  year: "Select your year.",
  coopTrack: "Use 40 characters or fewer.",
  goal: "Select a goal.",
  goalNotes: "Use 500 characters or fewer.",
  locationConstraint: "Select a location constraint.",
  constraintsNotes: "Use 500 characters or fewer.",
};

const STEP_ONE_KEYS = new Set([
  "consentPrivacy",
  "consentDataUse",
  "major",
  "year",
  "coopTrack",
]);

const textLinkClass =
  "inline-flex min-h-12 items-center font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2";

export type OnboardingDefaults = {
  consentPrivacy: boolean;
  consentDataUse: boolean;
  major: string;
  year: string;
  coopTrack: string;
  goal: string;
  goalNotes: string;
  locationConstraint: string;
  constraintsNotes: string;
};

type Step = 1 | 2 | 3;

function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map((part) => String(part)).join(".") || "body";
    if (!fields[key]) fields[key] = FIELD_COPY[key] ?? issue.message;
  }
  return fields;
}

function profilePayload(state: OnboardingDefaults): unknown {
  return {
    major: state.major,
    year: Number(state.year),
    coopTrack: state.coopTrack.trim(),
    goal: state.goal,
    goalNotes: state.goalNotes.trim(),
    locationConstraint: state.locationConstraint,
    constraintsNotes: state.constraintsNotes.trim(),
    consentPrivacy: state.consentPrivacy,
    consentDataUse: state.consentDataUse,
  };
}

function stepOneErrors(state: OnboardingDefaults): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!state.consentPrivacy) errors.consentPrivacy = FIELD_COPY.consentPrivacy;
  if (!state.consentDataUse) errors.consentDataUse = FIELD_COPY.consentDataUse;
  if (!MAJOR_OPTIONS.some((option) => option.value === state.major)) errors.major = FIELD_COPY.major;
  if (!YEAR_OPTIONS.some((option) => option.value === state.year)) errors.year = FIELD_COPY.year;
  if (state.coopTrack.trim().length > 40) errors.coopTrack = FIELD_COPY.coopTrack;
  return errors;
}

function stepForFields(fields: Record<string, string>): Step | null {
  const keys = Object.keys(fields);
  if (keys.some((key) => STEP_ONE_KEYS.has(key))) return 1;
  if (
    keys.some((key) =>
      ["goal", "goalNotes", "locationConstraint", "constraintsNotes"].includes(key),
    )
  ) {
    return 2;
  }
  if (keys.some((key) => key === "answers" || key.startsWith("answers."))) return 3;
  return null;
}

function pageForFields(fields: Record<string, string>): number | null {
  const index = INTEREST_ITEMS.findIndex((item) => {
    return Boolean(fields[item.id] || fields[`answers.${item.id}`]);
  });
  if (index < 0) return null;
  return Math.floor(index / PAGE_SIZE);
}

function answerError(fields: Record<string, string>, id: string): string | undefined {
  return fields[`answers.${id}`] ?? fields[id];
}

function clearKey(fields: Record<string, string>, key: string): Record<string, string> {
  if (!fields[key]) return fields;
  const next = { ...fields };
  delete next[key];
  return next;
}

export function OnboardingFlow({
  initialStep,
  defaults,
}: {
  initialStep: Step;
  defaults: OnboardingDefaults;
}) {
  const router = useRouter();
  const pendingRef = useRef(false);
  const [step, setStep] = useState<Step>(initialStep);
  const [form, setForm] = useState(defaults);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [questionPage, setQuestionPage] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update<K extends keyof OnboardingDefaults>(key: K, value: OnboardingDefaults[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => clearKey(current, key));
  }

  function showFields(fields: Record<string, string>) {
    setFieldErrors(fields);
    const nextStep = stepForFields(fields);
    if (nextStep === 1 || nextStep === 2) setStep(nextStep);
    if (nextStep === 3) {
      const page = pageForFields(fields);
      if (page != null) setQuestionPage(page);
      setStep(3);
    }
  }

  function onConsentNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = stepOneErrors(form);
    if (Object.keys(errors).length > 0) {
      setFormError(null);
      setFieldErrors((current) => ({ ...current, ...errors }));
      return;
    }
    setFormError(null);
    setFieldErrors((current) => {
      const next = { ...current };
      for (const key of STEP_ONE_KEYS) delete next[key];
      return next;
    });
    setStep(2);
  }

  async function onGoalsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;

    const parsed = ProfileInput.safeParse(profilePayload(form));
    if (!parsed.success) {
      setFormError(null);
      showFields(zodFields(parsed.error));
      return;
    }

    pendingRef.current = true;
    setPending(true);
    setFormError(null);
    const result = await sendJson(ROUTES.profileUpdate, "PUT", parsed.data);
    if (result.ok) {
      setFieldErrors({});
      setStep(3);
      pendingRef.current = false;
      setPending(false);
      return;
    }
    setFormError(result.error.message);
    showFields(result.error.fields ?? {});
    pendingRef.current = false;
    setPending(false);
  }

  function missingAnswerFields(ids: readonly string[]): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const id of ids) {
      const value = answers[id];
      if (value !== 1 && value !== 2 && value !== 3 && value !== 4 && value !== 5) {
        fields[`answers.${id}`] = "Choose a response.";
      }
    }
    return fields;
  }

  function onInterestsNext() {
    const start = questionPage * PAGE_SIZE;
    const ids = INTEREST_ITEMS.slice(start, start + PAGE_SIZE).map((item) => item.id);
    const fields = missingAnswerFields(ids);
    if (Object.keys(fields).length > 0) {
      setFormError(null);
      setFieldErrors(fields);
      return;
    }
    setFieldErrors({});
    setQuestionPage((current) => Math.min(current + 1, PAGE_COUNT - 1));
  }

  function onInterestsBack() {
    if (questionPage === 0) {
      setStep(2);
      return;
    }
    setFieldErrors({});
    setQuestionPage((current) => current - 1);
  }

  async function onInterestsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;

    const missing = missingAnswerFields(INTEREST_ITEMS.map((item) => item.id));
    if (Object.keys(missing).length > 0) {
      setFormError(null);
      showFields(missing);
      return;
    }

    const parsed = AssessmentInput.safeParse({
      instrument: INSTRUMENT,
      answers,
    });
    if (!parsed.success) {
      setFormError(null);
      showFields(zodFields(parsed.error));
      return;
    }

    pendingRef.current = true;
    setPending(true);
    setFormError(null);
    const result = await sendJson<{ scored: Record<string, number>; onboarded: boolean }>(
      ROUTES.assessment,
      "POST",
      parsed.data,
    );
    if (result.ok) {
      router.push(ROUTES.home);
      return;
    }
    setFormError(result.error.message);
    showFields(result.error.fields ?? {});
    pendingRef.current = false;
    setPending(false);
  }

  const answeredCount = INTEREST_ITEMS.filter((item) => {
    const value = answers[item.id];
    return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
  }).length;
  const pageStart = questionPage * PAGE_SIZE;
  const pageItems = INTEREST_ITEMS.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <div className="grid gap-4">
      <p className="text-sm font-medium text-neutral-700">Step {step} of 3</p>
      <Card>
        {formError ? (
          <div className="mb-4">
            <ErrorNote>{formError}</ErrorNote>
          </div>
        ) : null}

        {step === 1 ? (
          <form className="grid gap-4" noValidate onSubmit={onConsentNext}>
            <h2 className="text-lg font-semibold">Consent and basics</h2>
            <div className="grid gap-1.5">
              <Checkbox
                id="consentPrivacy"
                name="consentPrivacy"
                checked={form.consentPrivacy}
                onChange={(event) => update("consentPrivacy", event.target.checked)}
                label="I have read the Privacy Policy"
                aria-invalid={fieldErrors.consentPrivacy ? true : undefined}
              />
              <Link
                href={ROUTES.privacy}
                target="_blank"
                rel="noopener noreferrer"
                className={textLinkClass}
              >
                Privacy Policy
                <span className="sr-only"> (opens in a new tab)</span>
              </Link>
              {fieldErrors.consentPrivacy ? <ErrorNote>{fieldErrors.consentPrivacy}</ErrorNote> : null}
            </div>
            <div className="grid gap-1.5">
              <Checkbox
                id="consentDataUse"
                name="consentDataUse"
                checked={form.consentDataUse}
                onChange={(event) => update("consentDataUse", event.target.checked)}
                label="I agree that my answers and co-op reviews are stored and used, without my name, to produce ratings and recommendations for UC students"
                aria-invalid={fieldErrors.consentDataUse ? true : undefined}
              />
              {fieldErrors.consentDataUse ? <ErrorNote>{fieldErrors.consentDataUse}</ErrorNote> : null}
            </div>
            <Field label="Major" htmlFor="major" error={fieldErrors.major}>
              <Select
                id="major"
                name="major"
                value={form.major}
                onChange={(value) => update("major", value)}
                options={MAJOR_OPTIONS}
                placeholder="Select a major"
              />
            </Field>
            <Field label="Year" htmlFor="year" error={fieldErrors.year}>
              <Select
                id="year"
                name="year"
                value={form.year}
                onChange={(value) => update("year", value)}
                options={YEAR_OPTIONS}
                placeholder="Select a year"
              />
            </Field>
            <Field
              label="Co-op track"
              htmlFor="coopTrack"
              hint="Optional"
              error={fieldErrors.coopTrack}
            >
              <TextInput
                id="coopTrack"
                name="coopTrack"
                value={form.coopTrack}
                maxLength={40}
                onChange={(event) => update("coopTrack", event.target.value)}
              />
            </Field>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="submit" className="w-full sm:w-auto">
                Next
              </Button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <form className="grid gap-4" noValidate onSubmit={(event) => void onGoalsSubmit(event)}>
            <h2 className="text-lg font-semibold">Goals</h2>
            <Field label="Goal" htmlFor="goal" error={fieldErrors.goal}>
              <Select
                id="goal"
                name="goal"
                value={form.goal}
                onChange={(value) => update("goal", value)}
                options={GOAL_OPTIONS}
                placeholder="Select a goal"
                disabled={pending}
              />
            </Field>
            <Field label="Goal notes" htmlFor="goalNotes" hint="Optional" error={fieldErrors.goalNotes}>
              <Textarea
                id="goalNotes"
                name="goalNotes"
                value={form.goalNotes}
                maxLength={500}
                disabled={pending}
                onChange={(event) => update("goalNotes", event.target.value)}
              />
            </Field>
            <Field
              label="Location constraint"
              htmlFor="locationConstraint"
              error={fieldErrors.locationConstraint}
            >
              <Select
                id="locationConstraint"
                name="locationConstraint"
                value={form.locationConstraint}
                onChange={(value) => update("locationConstraint", value)}
                options={LOCATION_OPTIONS}
                placeholder="Select a location constraint"
                disabled={pending}
              />
            </Field>
            <Field
              label="Other constraints"
              htmlFor="constraintsNotes"
              hint="Optional"
              error={fieldErrors.constraintsNotes}
            >
              <Textarea
                id="constraintsNotes"
                name="constraintsNotes"
                value={form.constraintsNotes}
                maxLength={500}
                disabled={pending}
                onChange={(event) => update("constraintsNotes", event.target.value)}
              />
            </Field>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={pending}
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
                {pending ? "Saving…" : "Save and continue"}
              </Button>
            </div>
          </form>
        ) : null}

        {step === 3 ? (
          <form className="grid gap-4" noValidate onSubmit={(event) => void onInterestsSubmit(event)}>
            <h2 className="text-lg font-semibold">Interests</h2>
            <p className="text-sm text-neutral-700" aria-live="polite">
              Questions {pageStart + 1}–{pageStart + pageItems.length} of {INTEREST_ITEMS.length}.{" "}
              {answeredCount} of {INTEREST_ITEMS.length} answered.
            </p>
            <div className="grid gap-5">
              {pageItems.map((item) => {
                const error = answerError(fieldErrors, item.id);
                return (
                  <fieldset key={item.id} className="min-w-0 border-0 p-0">
                    <legend className="mb-2 text-base font-medium text-neutral-900">{item.text}</legend>
                    <LikertScale
                      name={item.id}
                      value={answers[item.id] ?? null}
                      labels={RESPONSE_LABELS}
                      onChange={(value) => {
                        setAnswers((current) => ({ ...current, [item.id]: value }));
                        setFieldErrors((current) => {
                          const withoutId = clearKey(current, item.id);
                          return clearKey(withoutId, `answers.${item.id}`);
                        });
                      }}
                    />
                    {error ? (
                      <div className="mt-1.5">
                        <ErrorNote>{error}</ErrorNote>
                      </div>
                    ) : null}
                  </fieldset>
                );
              })}
            </div>
            <p className="text-xs leading-relaxed text-neutral-600">{ATTRIBUTION}</p>
            {fieldErrors.answers ? <ErrorNote>{fieldErrors.answers}</ErrorNote> : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={pending}
                onClick={onInterestsBack}
              >
                Back
              </Button>
              {questionPage < PAGE_COUNT - 1 ? (
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={pending}
                  onClick={onInterestsNext}
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
                  {pending ? "Submitting…" : "Submit"}
                </Button>
              )}
            </div>
          </form>
        ) : null}
      </Card>
    </div>
  );
}
