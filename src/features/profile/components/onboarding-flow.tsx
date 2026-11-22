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
import { INSTRUMENT, QUIZ_INTRO, QUIZ_ITEMS, RESPONSE_LABELS } from "@/content/mini-ipip";
import {
  LOCATION_KEYS,
  LocationFields,
  locationErrors,
  locationPayload,
  type LocationValue,
} from "@/features/location/components/location-fields";
import { PrioritiesField } from "@/features/direction/components/priorities-field";
import type { Priority } from "@/features/direction/priorities";
import { MajorPicker } from "@/features/majors/components/major-picker";
import type { MajorSearchContext } from "@/features/majors/catalog";
import { isSelectableCatalogName, ProfileWriteInput, type MajorPickerValue } from "@/features/majors/selection";
import { SHARE_REVIEWS_CONSENT_LABEL } from "@/features/privacy/share-consent";
import { AssessmentInput } from "@/features/profile/schemas";
import { ROUTES } from "@/lib/constants";
import { sendJson } from "./api";
import { GOAL_OPTIONS, YEAR_OPTIONS } from "./options";

const PAGE_SIZE = 5;
const PAGE_COUNT = Math.ceil(QUIZ_ITEMS.length / PAGE_SIZE);

export const DATA_USE_CONSENT_LABEL =
  "I agree that my profile (including where I want to work), quiz answers and co-op reviews are stored so Swervly can show them to me, match me with roles, list companies in my area first, and so the founders can operate the service.";

export { SHARE_REVIEWS_CONSENT_LABEL };

const FIELD_COPY: Record<string, string> = {
  consentPrivacy: "Confirm that you have read the Privacy Policy.",
  consentDataUse:
    "Confirm that your answers and reviews can be stored as described.",
  school: "Enter your school (2–120 characters).",
  major: "Choose a major, Undecided, or enter the one that is missing.",
  majorSelection: "Choose a major, Undecided, or enter the one that is missing.",
  "majorSelection.name": "Enter your major (2–120 characters).",
  year: "Select your year.",
  goal: "Select a goal.",
  goalNotes: "Use 500 characters or fewer.",
  constraintsNotes: "Use 500 characters or fewer.",
};

const STEP_ONE_KEYS = new Set([
  "consentPrivacy",
  "consentDataUse",
  "consentShareReviews",
  "school",
  "major",
  "majorSelection",
  "majorSelection.name",
  "exploringMajors",
  "year",
]);

const textLinkClass =
  "inline-flex min-h-12 items-center font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

export type OnboardingDefaults = {
  consentPrivacy: boolean;
  consentDataUse: boolean;
  consentShareReviews: boolean;
  school: string;
  major: MajorPickerValue;
  exploringMajors: boolean;
  year: string;
  goal: string;
  goalNotes: string;
  location: LocationValue;
  priorities: Priority[];
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

function majorSelectionPayload(state: OnboardingDefaults) {
  if (state.major.source === "undecided") return { source: "undecided" as const };
  if (state.major.source === "custom") return { source: "custom" as const, name: state.major.name.trim() };
  return { source: "catalog" as const, name: state.major.name };
}

function profilePayload(state: OnboardingDefaults): unknown {
  return {
    school: state.school.trim(),
    year: Number(state.year),
    goal: state.goal,
    goalNotes: state.goalNotes.trim(),
    ...locationPayload(state.location),
    priorities: state.priorities,
    constraintsNotes: state.constraintsNotes.trim(),
    consentPrivacy: state.consentPrivacy,
    consentDataUse: state.consentDataUse,
    consentShareReviews: state.consentShareReviews,
    majorSelection: majorSelectionPayload(state),
    exploringMajors: state.major.source === "undecided" ? false : state.exploringMajors,
  };
}

/** Step-1 validation. Share-reviews consent is optional and never blocks progress. */
export function stepOneErrors(
  state: OnboardingDefaults,
  context: MajorSearchContext = {},
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!state.consentPrivacy) errors.consentPrivacy = FIELD_COPY.consentPrivacy;
  if (!state.consentDataUse) errors.consentDataUse = FIELD_COPY.consentDataUse;
  const school = state.school.trim();
  if (school.length < 2 || school.length > 120) errors.school = FIELD_COPY.school;
  if (state.major.source === "custom") {
    const name = state.major.name.trim();
    if (name.length < 2 || name.length > 120) errors.major = FIELD_COPY["majorSelection.name"];
  } else if (state.major.source === "catalog" && !isSelectableCatalogName(state.major.name, context)) {
    errors.major = FIELD_COPY.major;
  }
  if (!YEAR_OPTIONS.some((option) => option.value === state.year)) errors.year = FIELD_COPY.year;
  return errors;
}

function stepForFields(fields: Record<string, string>): Step | null {
  const keys = Object.keys(fields);
  if (keys.some((key) => STEP_ONE_KEYS.has(key))) return 1;
  if (
    keys.some((key) =>
      ["goal", "goalNotes", "constraintsNotes", "priorities", ...LOCATION_KEYS].includes(key),
    )
  ) {
    return 2;
  }
  if (keys.some((key) => key === "answers" || key.startsWith("answers."))) return 3;
  return null;
}

function pageForFields(fields: Record<string, string>): number | null {
  const index = QUIZ_ITEMS.findIndex((item) => {
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
  majorSearch,
}: {
  initialStep: Step;
  defaults: OnboardingDefaults;
  majorSearch?: MajorSearchContext;
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

  function updateLocation(location: LocationValue) {
    setForm((current) => ({ ...current, location }));
    setFieldErrors((current) => LOCATION_KEYS.reduce(clearKey, current));
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
    const errors = stepOneErrors(form, majorSearch);
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

    const missingLocation = locationErrors(form.location);
    if (Object.keys(missingLocation).length > 0) {
      setFormError(null);
      showFields(missingLocation);
      return;
    }
    const parsed = ProfileWriteInput.safeParse(profilePayload(form));
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
    const ids = QUIZ_ITEMS.slice(start, start + PAGE_SIZE).map((item) => item.id);
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

    const missing = missingAnswerFields(QUIZ_ITEMS.map((item) => item.id));
    if (Object.keys(missing).length > 0) {
      setFormError(null);
      showFields(missing);
      return;
    }

    const parsed = AssessmentInput.safeParse({
      instrument: INSTRUMENT,
      answers,
      // Asked at the end of the quiz. Undecided students always see majors.
      ...(form.major.source === "undecided" ? {} : { exploringMajors: form.exploringMajors }),
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
      // Direction opens with the new work-style card when it sees quiz=done.
      router.push(`${ROUTES.direction}?quiz=done`);
      return;
    }
    setFormError(result.error.message);
    showFields(result.error.fields ?? {});
    pendingRef.current = false;
    setPending(false);
  }

  const answeredCount = QUIZ_ITEMS.filter((item) => {
    const value = answers[item.id];
    return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
  }).length;
  const pageStart = questionPage * PAGE_SIZE;
  const pageItems = QUIZ_ITEMS.slice(pageStart, pageStart + PAGE_SIZE);

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
            <div className="grid gap-1.5 [&_label]:items-start [&_input]:mt-0.5">
              <Checkbox
                id="consentDataUse"
                name="consentDataUse"
                checked={form.consentDataUse}
                onChange={(event) => update("consentDataUse", event.target.checked)}
                label={DATA_USE_CONSENT_LABEL}
                aria-invalid={fieldErrors.consentDataUse ? true : undefined}
              />
              {fieldErrors.consentDataUse ? <ErrorNote>{fieldErrors.consentDataUse}</ErrorNote> : null}
            </div>
            <div className="grid gap-1.5 [&_label]:items-start [&_input]:mt-0.5">
              <Checkbox
                id="consentShareReviews"
                name="consentShareReviews"
                checked={form.consentShareReviews}
                onChange={(event) => update("consentShareReviews", event.target.checked)}
                label={SHARE_REVIEWS_CONSENT_LABEL}
              />
            </div>
            <Field
              label="School"
              htmlFor="school"
              hint="Suggested from your email when we recognize the domain. Change it if it is wrong."
              error={fieldErrors.school}
            >
              <TextInput
                id="school"
                name="school"
                value={form.school}
                maxLength={120}
                autoComplete="organization"
                onChange={(event) => update("school", event.target.value)}
              />
            </Field>
            <MajorPicker
              id="major"
              value={form.major}
              context={majorSearch}
              error={fieldErrors.major}
              onChange={(value) => update("major", value)}
            />
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
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="submit" className="w-full sm:w-auto">
                Next
              </Button>
            </div>
          </form>
        ) : null}

        {step === 2 ? (
          <form className="grid gap-4" noValidate onSubmit={(event) => void onGoalsSubmit(event)}>
            <h2 className="text-lg font-semibold">Goals and location</h2>
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
            <PrioritiesField
              value={form.priorities}
              onChange={(value) => update("priorities", value)}
              error={fieldErrors.priorities}
              disabled={pending}
            />
            <LocationFields
              value={form.location}
              onChange={updateLocation}
              errors={fieldErrors}
              disabled={pending}
            />
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
            <h2 className="text-lg font-semibold">About you</h2>
            <p className="text-sm text-neutral-700">
              About a minute. There are no right answers. Pick the line that sounds like you now.
            </p>
            <p className="text-sm text-neutral-600">{QUIZ_INTRO}</p>
            <p className="text-sm text-neutral-700" aria-live="polite">
              Questions {pageStart + 1}–{pageStart + pageItems.length} of {QUIZ_ITEMS.length}.{" "}
              {answeredCount} of {QUIZ_ITEMS.length} answered.
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
            {fieldErrors.answers ? <ErrorNote>{fieldErrors.answers}</ErrorNote> : null}
            {questionPage === PAGE_COUNT - 1 && form.major.source !== "undecided" ? (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2">
                <Checkbox
                  id="exploringMajors"
                  name="exploringMajors"
                  checked={form.exploringMajors}
                  onChange={(event) => update("exploringMajors", event.target.checked)}
                  label="Also suggest similar majors to explore. Career direction stays either way."
                />
              </div>
            ) : null}
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
