"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { Button, Checkbox, ErrorNote, Field, LikertScale, Select, Textarea, TextInput } from "@/components/ui";
import { QUIZ_INTRO, QUIZ_ITEMS, RESPONSE_LABELS } from "@/content/mini-ipip";
import { PrioritiesField } from "@/features/direction/components/priorities-field";
import { LocationFields, type LocationValue } from "@/features/location/components/location-fields";
import type { MajorSearchContext } from "@/features/majors/catalog";
import { MajorPicker } from "@/features/majors/components/major-picker";
import { SHARE_REVIEWS_CONSENT_LABEL } from "@/features/privacy/share-consent";
import { suggestsMajors } from "@/lib/audience";
import { ROUTES } from "@/lib/constants";
import {
  answerError,
  DATA_USE_CONSENT_LABEL,
  PAGE_COUNT,
  PAGE_SIZE,
  pageItems,
  type OnboardingDefaults,
} from "./onboarding-model";
import { GOAL_OPTIONS, YEAR_OPTIONS } from "./options";

type Update = <K extends keyof OnboardingDefaults>(key: K, value: OnboardingDefaults[K]) => void;
type Errors = Record<string, string>;

const textLinkClass =
  "inline-flex min-h-12 items-center font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

function BackNext({ pending, onBack, next }: { pending: boolean; onBack: () => void; next: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
      <Button type="button" variant="secondary" className="w-full sm:w-auto" disabled={pending} onClick={onBack}>
        Back
      </Button>
      {next}
    </div>
  );
}

/** Step 1: consent, school, major and year. */
export function ConsentStep({
  form,
  errors,
  majorSearch,
  update,
  onSubmit,
}: {
  form: OnboardingDefaults;
  errors: Errors;
  majorSearch?: MajorSearchContext;
  update: Update;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      <h2 className="text-lg font-semibold">Consent and basics</h2>
      <div className="grid gap-1.5">
        <Checkbox
          id="consentPrivacy"
          name="consentPrivacy"
          checked={form.consentPrivacy}
          onChange={(event) => update("consentPrivacy", event.target.checked)}
          label="I have read the Privacy Policy"
          aria-invalid={errors.consentPrivacy ? true : undefined}
        />
        <Link href={ROUTES.privacy} target="_blank" rel="noopener noreferrer" className={textLinkClass}>
          Privacy Policy
          <span className="sr-only"> (opens in a new tab)</span>
        </Link>
        {errors.consentPrivacy ? <ErrorNote>{errors.consentPrivacy}</ErrorNote> : null}
      </div>
      <div className="grid gap-1.5 [&_label]:items-start [&_input]:mt-0.5">
        <Checkbox
          id="consentDataUse"
          name="consentDataUse"
          checked={form.consentDataUse}
          onChange={(event) => update("consentDataUse", event.target.checked)}
          label={DATA_USE_CONSENT_LABEL}
          aria-invalid={errors.consentDataUse ? true : undefined}
        />
        {errors.consentDataUse ? <ErrorNote>{errors.consentDataUse}</ErrorNote> : null}
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
        error={errors.school}
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
      <MajorPicker id="major" value={form.major} context={majorSearch} error={errors.major} onChange={(value) => update("major", value)} />
      <Field label="Year" htmlFor="year" error={errors.year}>
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
  );
}

/** Step 2: goal, priorities, location and other constraints. */
export function GoalsStep({
  form,
  errors,
  pending,
  update,
  updateLocation,
  onBack,
  onSubmit,
}: {
  form: OnboardingDefaults;
  errors: Errors;
  pending: boolean;
  update: Update;
  updateLocation: (location: LocationValue) => void;
  onBack: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      <h2 className="text-lg font-semibold">Goals and location</h2>
      <Field label="Goal" htmlFor="goal" error={errors.goal}>
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
      <Field label="Goal notes" htmlFor="goalNotes" hint="Optional" error={errors.goalNotes}>
        <Textarea
          id="goalNotes"
          name="goalNotes"
          value={form.goalNotes}
          maxLength={500}
          disabled={pending}
          onChange={(event) => update("goalNotes", event.target.value)}
        />
      </Field>
      <PrioritiesField value={form.priorities} onChange={(value) => update("priorities", value)} error={errors.priorities} disabled={pending} />
      <LocationFields value={form.location} onChange={updateLocation} errors={errors} disabled={pending} />
      <Field label="Other constraints" htmlFor="constraintsNotes" hint="Optional" error={errors.constraintsNotes}>
        <Textarea
          id="constraintsNotes"
          name="constraintsNotes"
          value={form.constraintsNotes}
          maxLength={500}
          disabled={pending}
          onChange={(event) => update("constraintsNotes", event.target.value)}
        />
      </Field>
      <BackNext
        pending={pending}
        onBack={onBack}
        next={
          <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
            {pending ? "Saving…" : "Save and continue"}
          </Button>
        }
      />
    </form>
  );
}

/** Step 3: the work-style quiz, one page of questions at a time. */
export function QuizStep({
  form,
  errors,
  pending,
  page,
  answers,
  answeredCount,
  update,
  onAnswer,
  onBack,
  onNext,
  onSubmit,
}: {
  form: OnboardingDefaults;
  errors: Errors;
  pending: boolean;
  page: number;
  answers: Readonly<Record<string, number>>;
  answeredCount: number;
  update: Update;
  onAnswer: (id: string, value: number) => void;
  onBack: () => void;
  onNext: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const items = pageItems(page);
  const start = page * PAGE_SIZE;
  const lastPage = page === PAGE_COUNT - 1;
  return (
    <form className="grid gap-4" noValidate onSubmit={onSubmit}>
      <h2 className="text-lg font-semibold">About you</h2>
      <p className="text-sm text-neutral-700">About a minute. There are no right answers. Pick the line that sounds like you now.</p>
      <p className="text-sm text-neutral-600">{QUIZ_INTRO}</p>
      <p className="text-sm text-neutral-700" aria-live="polite">
        Questions {start + 1}–{start + items.length} of {QUIZ_ITEMS.length}.{" "}
        {answeredCount} of {QUIZ_ITEMS.length} answered.
      </p>
      <div className="grid gap-5">
        {items.map((item) => {
          const error = answerError(errors, item.id);
          return (
            <fieldset key={item.id} className="min-w-0 border-0 p-0">
              <legend className="mb-2 text-base font-medium text-neutral-900">{item.text}</legend>
              <LikertScale name={item.id} value={answers[item.id] ?? null} labels={RESPONSE_LABELS} onChange={(value) => onAnswer(item.id, value)} />
              {error ? (
                <div className="mt-1.5">
                  <ErrorNote>{error}</ErrorNote>
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
      {errors.answers ? <ErrorNote>{errors.answers}</ErrorNote> : null}
      {suggestsMajors && lastPage && form.major.source !== "undecided" ? (
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
      <BackNext
        pending={pending}
        onBack={onBack}
        next={
          lastPage ? (
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              {pending ? "Submitting…" : "Submit"}
            </Button>
          ) : (
            <Button type="button" className="w-full sm:w-auto" disabled={pending} onClick={onNext}>
              Next
            </Button>
          )
        }
      />
    </form>
  );
}
