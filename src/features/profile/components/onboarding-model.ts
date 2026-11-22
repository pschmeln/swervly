"use client";

import type { ZodError } from "zod";
import { QUIZ_ITEMS } from "@/content/mini-ipip";
import type { Priority } from "@/features/direction/priorities";
import { LOCATION_KEYS, locationPayload, type LocationValue } from "@/features/location/components/location-fields";
import type { MajorSearchContext } from "@/features/majors/catalog";
import { isSelectableCatalogName, type MajorPickerValue } from "@/features/majors/selection";
import { SHARE_REVIEWS_CONSENT_LABEL } from "@/features/privacy/share-consent";
import { offersUndecided } from "@/lib/audience";
import { YEAR_OPTIONS } from "./options";

/**
 * Onboarding's form state, copy, validation and payloads. No React, but marked as a client
 * module because it uses the location helpers, which live in a client module.
 */

export const PAGE_SIZE = 5;
export const PAGE_COUNT = Math.ceil(QUIZ_ITEMS.length / PAGE_SIZE);

export const DATA_USE_CONSENT_LABEL =
  "I agree that my profile (including where I want to work), quiz answers, co-op reviews and anything I post in Community are stored so Swervly can show them to me, match me with roles, list companies in my area first, and so the founders can operate the service.";

export { SHARE_REVIEWS_CONSENT_LABEL };

const MAJOR_FIELD_COPY = offersUndecided
  ? "Choose a major, Undecided, or enter the one that is missing."
  : "Choose a major, or enter the one that is missing.";

export const FIELD_COPY: Record<string, string> = {
  consentPrivacy: "Confirm that you have read the Privacy Policy.",
  consentDataUse:
    "Confirm that your answers and reviews can be stored as described.",
  school: "Enter your school (2–120 characters).",
  major: MAJOR_FIELD_COPY,
  majorSelection: MAJOR_FIELD_COPY,
  "majorSelection.name": "Enter your major (2–120 characters).",
  year: "Select your year.",
  goal: "Select a goal.",
  goalNotes: "Use 500 characters or fewer.",
  constraintsNotes: "Use 500 characters or fewer.",
};

export const STEP_ONE_KEYS: ReadonlySet<string> = new Set([
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

export type Step = 1 | 2 | 3;

export function zodFields(error: ZodError): Record<string, string> {
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

export function profilePayload(state: OnboardingDefaults): unknown {
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

export function stepForFields(fields: Record<string, string>): Step | null {
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

export function pageForFields(fields: Record<string, string>): number | null {
  const index = QUIZ_ITEMS.findIndex((item) => {
    return Boolean(fields[item.id] || fields[`answers.${item.id}`]);
  });
  if (index < 0) return null;
  return Math.floor(index / PAGE_SIZE);
}

export function answerError(fields: Record<string, string>, id: string): string | undefined {
  return fields[`answers.${id}`] ?? fields[id];
}

export function clearKey(fields: Record<string, string>, key: string): Record<string, string> {
  if (!fields[key]) return fields;
  const next = { ...fields };
  delete next[key];
  return next;
}

/** Errors for quiz items without a 1–5 answer. */
export function missingAnswerFields(answers: Readonly<Record<string, number>>, ids: readonly string[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const id of ids) {
    if (!isAnswered(answers[id])) fields[`answers.${id}`] = "Choose a response.";
  }
  return fields;
}

export function isAnswered(value: number | undefined): boolean {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

/** The quiz items on one page. */
export function pageItems(page: number) {
  return QUIZ_ITEMS.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
}
