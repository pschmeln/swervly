import { z } from "zod";
import { ProfileInput } from "@/features/profile/schemas";
import {
  cleanMajorName,
  matchCatalog,
  normalizeMajorName,
  UNDECIDED_LABEL,
  type CatalogMajor,
  type MajorSearchContext,
} from "./catalog";

export const MajorSelectionInput = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("catalog"),
    name: z.string().trim().min(1).max(120),
  }),
  z.object({
    source: z.literal("undecided"),
  }),
  z.object({
    source: z.literal("custom"),
    name: z.string().trim().min(2).max(120),
  }),
]);

export type MajorSelectionInput = z.infer<typeof MajorSelectionInput>;

export const ProfileWriteInput = ProfileInput.omit({ major: true }).extend({
  major: z.string().trim().min(1).max(120).optional(),
  majorSelection: MajorSelectionInput.optional(),
  exploringMajors: z.boolean().optional(),
});

export type ProfileWriteInput = z.infer<typeof ProfileWriteInput>;

export type ResolvedMajorWrite = {
  source: "catalog" | "custom" | "undecided";
  /** Public grouping key. Null for custom and undecided so the text is not shared. */
  major: string | null;
  customMajorText: string | null;
  exploringMajors: boolean;
  submission: { rawName: string; normalizedName: string } | null;
};

export type StoredMajor = {
  major: string | null;
  majorSource: string | null;
  customMajorText: string | null;
  exploringMajors?: boolean;
};

export type MajorPickerValue = {
  source: "catalog" | "undecided" | "custom";
  name: string;
};

type ResolveResult = { ok: true; write: ResolvedMajorWrite } | { ok: false; message: string };

function catalogWrite(name: string, exploringMajors: boolean): ResolvedMajorWrite {
  return {
    source: "catalog",
    major: name,
    customMajorText: null,
    exploringMajors,
    submission: null,
  };
}

function customWrite(rawName: string, exploringMajors: boolean): ResolvedMajorWrite {
  return {
    source: "custom",
    major: null,
    customMajorText: rawName,
    exploringMajors,
    submission: { rawName, normalizedName: normalizeMajorName(rawName) },
  };
}

export function resolveMajorWrite(
  input: {
    major?: string;
    majorSelection?: MajorSelectionInput;
    exploringMajors?: boolean;
  },
  context: MajorSearchContext = {},
): ResolveResult {
  const exploringRequested = input.exploringMajors === true;

  if (input.majorSelection?.source === "undecided") {
    return {
      ok: true,
      write: {
        source: "undecided",
        major: null,
        customMajorText: null,
        exploringMajors: false,
        submission: null,
      },
    };
  }

  if (input.majorSelection?.source === "catalog") {
    const match = matchCatalog(input.majorSelection.name, context);
    if (!match) return { ok: false, message: "Choose a major from the list." };
    return { ok: true, write: catalogWrite(match.name, exploringRequested) };
  }

  if (input.majorSelection?.source === "custom") {
    const rawName = cleanMajorName(input.majorSelection.name);
    if (rawName.length < 2 || rawName.length > 120) {
      return { ok: false, message: "Enter your major (2–120 characters)." };
    }
    const match = matchCatalog(rawName, context);
    if (match && !match.legacy) {
      return { ok: true, write: catalogWrite(match.name, exploringRequested) };
    }
    return { ok: true, write: customWrite(rawName, exploringRequested) };
  }

  if (input.major) {
    const rawName = cleanMajorName(input.major);
    const match = matchCatalog(rawName, context);
    if (match) return { ok: true, write: catalogWrite(match.name, exploringRequested) };
    if (rawName.length < 2 || rawName.length > 120) {
      return { ok: false, message: "Enter your major (2–120 characters)." };
    }
    return { ok: true, write: customWrite(rawName, exploringRequested) };
  }

  return { ok: false, message: "Select your major." };
}

/**
 * Major string safe to use in company pages and skill counts.
 * Custom text and undecided never qualify, even if `major` still holds text.
 */
export function publicAggregateMajor(row: {
  major: string | null;
  majorSource: string | null;
}): string | null {
  if (row.majorSource === "custom" || row.majorSource === "undecided") return null;
  const name = row.major?.trim() ?? "";
  if (!name) return null;
  if (row.majorSource === "catalog") return name;
  const match = matchCatalog(name);
  if (!match) return null;
  return match.name;
}

export function selectionFromStored(stored: StoredMajor): MajorPickerValue {
  if (stored.majorSource === "undecided") return { source: "undecided", name: "" };
  if (stored.majorSource === "custom") {
    return { source: "custom", name: stored.customMajorText ?? stored.major ?? "" };
  }
  if (stored.majorSource === "catalog" && stored.major) {
    return { source: "catalog", name: stored.major };
  }
  if (stored.major) {
    const match = matchCatalog(stored.major);
    if (match) return { source: "catalog", name: match.name };
    return { source: "custom", name: stored.major };
  }
  return { source: "catalog", name: "" };
}

export function displayMajor(stored: StoredMajor): string {
  const selection = selectionFromStored(stored);
  if (selection.source === "undecided") return UNDECIDED_LABEL;
  return selection.name;
}

export type AcademicSource = "catalog" | "custom" | "undecided" | "unset";

export function academicSource(stored: StoredMajor): AcademicSource {
  if (!stored.major && !stored.majorSource && !stored.customMajorText) return "unset";
  return selectionFromStored(stored).source;
}

export type MajorSuggestion = {
  name: string;
  category: string;
  reason: string;
};

export type AcademicExploration = {
  visible: boolean;
  note: string;
  suggestions: MajorSuggestion[];
};

const INDUSTRY_EXPLORATIONS = ["Business Administration", "Nursing", "Computer Science", "Psychology"] as const;
const GRAD_EXPLORATIONS = ["Biology", "Psychology", "Economics", "Mathematics"] as const;

function suggestionsFor(names: readonly string[], goal: "industry" | "grad_school"): MajorSuggestion[] {
  const because =
    goal === "industry" ? "you said your goal is industry work" : "you said your goal is graduate school";
  const suggestions: MajorSuggestion[] = [];
  for (const name of names) {
    const match = matchCatalog(name);
    if (!match || match.legacy) continue;
    suggestions.push({
      name: match.name,
      category: match.category,
      reason: `Worth exploring because ${because}. ${match.name} is one place to look. This is not a fit score.`,
    });
  }
  return suggestions;
}

/**
 * Suggested majors follow the student's stated goal. Quiz traits are not an input.
 * Confirmed majors stay hidden until the student opts in.
 */
export function academicExploration(input: {
  source: AcademicSource;
  exploringMajors: boolean;
  goal: "industry" | "grad_school" | "undecided";
}): AcademicExploration {
  const confirmed = input.source === "catalog" || input.source === "custom";
  const visible = input.source === "undecided" || (confirmed && input.exploringMajors);
  if (!visible) {
    return {
      visible: false,
      note: "Suggested majors stay hidden because you already chose a major. You can explore other majors from your profile. Career direction stays available.",
      suggestions: [],
    };
  }

  if (input.goal === "undecided") {
    return {
      visible: true,
      note: "Not enough information to suggest majors. Quiz results are not used as a major-fit score.",
      suggestions: [],
    };
  }

  return {
    visible: true,
    note: "These are places to look from the goal you stated. They are not a fit score, and the quiz is not used here.",
    suggestions: suggestionsFor(input.goal === "industry" ? INDUSTRY_EXPLORATIONS : GRAD_EXPLORATIONS, input.goal),
  };
}

export function isSelectableCatalogName(name: string, context: MajorSearchContext = {}): boolean {
  return matchCatalog(name, context) != null && name.trim().length > 0;
}

export type { CatalogMajor };
