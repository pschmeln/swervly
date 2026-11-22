import type { PlaceOption } from "@/features/location/components/place-search";
import type { RotationListItem } from "@/features/review/components/types";
import { MAX_ROTATIONS } from "@/lib/constants";

/** The co-op form's state, options and request bodies. No React, so it is safe to import anywhere. */

const CURRENT_YEAR = new Date().getFullYear();

export const TERM_SEASON_OPTIONS = [
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
] as const;

export const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2015 + 1 }, (_, index) => {
  const year = String(CURRENT_YEAR - index);
  return { value: year, label: year };
});

const ROTATION_NUMBERS = Array.from({ length: MAX_ROTATIONS }, (_, index) => index + 1);

export const ROTATION_NUMBER_OPTIONS = ROTATION_NUMBERS.map((n) => ({ value: String(n), label: String(n) }));

export const MAX_SKILLS = 10;

export type RatingKey = "enjoyment" | "learning" | "mentorship" | "clarityGained";

/** The four 1–5 ratings, in the order the form asks them. */
export const RATINGS: readonly { key: RatingKey; label: string; labels: readonly string[] }[] = [
  { key: "enjoyment", label: "How much did you enjoy the work?", labels: ["Not at all", "Slightly", "Somewhat", "A lot", "Loved it"] },
  { key: "learning", label: "How much did you learn?", labels: ["Very little", "A little", "Some", "A lot", "A great deal"] },
  { key: "mentorship", label: "How good was the mentorship?", labels: ["None", "Poor", "Fair", "Good", "Excellent"] },
  {
    key: "clarityGained",
    label: "Did this co-op make it clearer what you want next?",
    labels: ["Not at all", "Slightly", "Somewhat", "Clearer", "Much clearer"],
  },
];

export type FormFields = {
  employerId: string;
  employerName: string;
  employerCity: string | null;
  roleTitle: string;
  termSeason: string;
  termYear: string;
  rotationNumber: string;
  payHourly: string;
  workPlace: PlaceOption | null;
  roleType: string;
  wouldReturn: string;
  enjoyment: number | null;
  learning: number | null;
  mentorship: number | null;
  clarityGained: number | null;
  skillsUsed: string[];
  freeText: string;
  shareFreeText: boolean;
};

export type FieldErrors = Record<string, string>;

export function initialFromRotation(rotation: RotationListItem): FormFields {
  return {
    employerId: rotation.employer.id,
    employerName: rotation.employer.name,
    employerCity: null,
    roleTitle: rotation.roleTitle,
    termSeason: rotation.termSeason,
    termYear: String(rotation.termYear),
    rotationNumber: String(rotation.rotationNumber),
    payHourly: rotation.payHourly ?? "",
    workPlace: rotation.workPlaceGeoid && rotation.workLabel ? { geoid: rotation.workPlaceGeoid, label: rotation.workLabel } : null,
    roleType: rotation.roleType,
    wouldReturn: rotation.wouldReturn,
    enjoyment: rotation.review.enjoyment,
    learning: rotation.review.learning,
    mentorship: rotation.review.mentorship,
    clarityGained: rotation.review.clarityGained,
    skillsUsed: rotation.review.skillsUsed,
    freeText: rotation.review.freeText ?? "",
    shareFreeText: rotation.review.shareFreeText,
  };
}

export function initialForCreate(usedRotationNumbers: readonly number[]): FormFields {
  const firstFree = ROTATION_NUMBERS.find((n) => !usedRotationNumbers.includes(n)) ?? 1;
  return {
    employerId: "",
    employerName: "",
    employerCity: null,
    roleTitle: "",
    termSeason: "",
    termYear: String(CURRENT_YEAR),
    rotationNumber: String(firstFree),
    payHourly: "",
    workPlace: null,
    roleType: "",
    wouldReturn: "",
    enjoyment: null,
    learning: null,
    mentorship: null,
    clarityGained: null,
    skillsUsed: [],
    freeText: "",
    shareFreeText: false,
  };
}

/** The first error found under any of the keys (the API may report "x" or "review.x"). */
export function fieldError(fields: FieldErrors | undefined, ...keys: string[]): string | undefined {
  if (!fields) return undefined;
  for (const key of keys) {
    if (fields[key]) return fields[key];
  }
  return undefined;
}

/** Errors to clear when a field changes. */
export function clearedErrors(errors: FieldErrors, key: string): FieldErrors {
  const next = { ...errors };
  delete next[key];
  delete next[`review.${key}`];
  if (key === "employerId" || key === "employerName") {
    delete next.employerId;
    delete next.name;
  }
  return next;
}

/** Hourly pay as typed: undefined when blank, NaN when not a number. */
export function parsePay(text: string): number | undefined {
  const trimmed = text.trim();
  return trimmed === "" ? undefined : Number(trimmed);
}

/** The note is shared only when there is a note. */
export function sharesNote(form: FormFields): boolean {
  return form.freeText.trim().length > 0 && form.shareFreeText;
}

/** Body for POST /api/rotations and PUT /api/rotations/[id]. */
export function rotationBody(form: FormFields, payHourly: number | undefined) {
  const note = form.freeText.trim();
  return {
    employerId: form.employerId,
    roleTitle: form.roleTitle.trim(),
    termSeason: form.termSeason,
    termYear: Number(form.termYear),
    rotationNumber: Number(form.rotationNumber),
    ...(payHourly !== undefined ? { payHourly } : {}),
    workPlaceGeoid: form.workPlace?.geoid ?? null,
    roleType: form.roleType,
    wouldReturn: form.wouldReturn,
    review: {
      enjoyment: form.enjoyment,
      learning: form.learning,
      mentorship: form.mentorship,
      clarityGained: form.clarityGained,
      skillsUsed: form.skillsUsed,
      ...(note !== "" ? { freeText: note } : {}),
      shareFreeText: sharesNote(form),
    },
  };
}

/** Body for the company-page preview, or the message to show when the form isn't ready for one. */
export function previewBody(form: FormFields, rotationId: string | undefined): { body: object } | { error: string } {
  if (!form.employerId || !form.wouldReturn || !form.roleType) {
    return { error: "Choose a company, a role type, and whether you would go back." };
  }
  if (form.enjoyment == null || form.learning == null || form.mentorship == null || form.clarityGained == null) {
    return { error: "Answer the four ratings before previewing." };
  }
  const payHourly = parsePay(form.payHourly);
  return {
    body: {
      employerId: form.employerId,
      ...(rotationId ? { rotationId } : {}),
      roleType: form.roleType,
      wouldReturn: form.wouldReturn,
      ...(payHourly !== undefined && Number.isFinite(payHourly) ? { payHourly } : {}),
      enjoyment: form.enjoyment,
      learning: form.learning,
      mentorship: form.mentorship,
      clarityGained: form.clarityGained,
      skillsUsed: form.skillsUsed,
      freeText: form.freeText,
      shareFreeText: sharesNote(form),
    },
  };
}
