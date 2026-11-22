"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { Card, ErrorNote } from "@/components/ui";
import { INSTRUMENT, QUIZ_ITEMS } from "@/content/mini-ipip";
import { LOCATION_KEYS, locationErrors, type LocationValue } from "@/features/location/components/location-fields";
import type { MajorSearchContext } from "@/features/majors/catalog";
import { ProfileWriteInput } from "@/features/majors/selection";
import { AssessmentInput } from "@/features/profile/schemas";
import { ROUTES } from "@/lib/constants";
import { sendJson } from "./api";
import {
  clearKey,
  isAnswered,
  missingAnswerFields,
  PAGE_COUNT,
  pageForFields,
  pageItems,
  profilePayload,
  STEP_ONE_KEYS,
  stepForFields,
  stepOneErrors,
  zodFields,
  type OnboardingDefaults,
  type Step,
} from "./onboarding-model";
import { ConsentStep, GoalsStep, QuizStep } from "./onboarding-steps";

export {
  DATA_USE_CONSENT_LABEL,
  SHARE_REVIEWS_CONSENT_LABEL,
  stepOneErrors,
  type OnboardingDefaults,
} from "./onboarding-model";

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

  function onInterestsNext() {
    const ids = pageItems(questionPage).map((item) => item.id);
    const fields = missingAnswerFields(answers, ids);
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

    const missing = missingAnswerFields(answers, QUIZ_ITEMS.map((item) => item.id));
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

  const answeredCount = QUIZ_ITEMS.filter((item) => isAnswered(answers[item.id])).length;

  function onAnswer(id: string, value: number) {
    setAnswers((current) => ({ ...current, [id]: value }));
    setFieldErrors((current) => clearKey(clearKey(current, id), `answers.${id}`));
  }

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
          <ConsentStep form={form} errors={fieldErrors} majorSearch={majorSearch} update={update} onSubmit={onConsentNext} />
        ) : null}
        {step === 2 ? (
          <GoalsStep
            form={form}
            errors={fieldErrors}
            pending={pending}
            update={update}
            updateLocation={updateLocation}
            onBack={() => setStep(1)}
            onSubmit={(event) => void onGoalsSubmit(event)}
          />
        ) : null}
        {step === 3 ? (
          <QuizStep
            form={form}
            errors={fieldErrors}
            pending={pending}
            page={questionPage}
            answers={answers}
            answeredCount={answeredCount}
            update={update}
            onAnswer={onAnswer}
            onBack={onInterestsBack}
            onNext={onInterestsNext}
            onSubmit={(event) => void onInterestsSubmit(event)}
          />
        ) : null}
      </Card>
    </div>
  );
}
