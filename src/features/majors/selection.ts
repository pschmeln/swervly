import { GRAD_MAJORS, INDUSTRY_MAJORS, type MajorTraitLink } from "@/content/major-traits";
import { traitBand, traitHeadline } from "@/features/profile/traits";
import type { TraitScores } from "@/features/profile/scoring";
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
import { suggestsMajors } from "@/lib/audience";

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

/**
 * Personal reason for one major: the student's own result on the trait the
 * major leans on, then what the work is like. Describes the student's own answer; never a score.
 */
export function majorReason(
  link: MajorTraitLink,
  name: string,
  traits: TraitScores,
  /** True when an earlier suggestion already described this trait: refer back instead of repeating it. */
  repeat = false,
): { text: string; score: number } {
  const band = traitBand(traits[link.trait]);
  const score = band === link.fits ? 2 : band === "middle" ? 1 : 0;
  if (repeat) {
    const tail = score === 2 ? "It leans on that same strength." : score === 1 ? "It uses that same mix." : "It would stretch you the same way.";
    return { score, text: `${name} ${link.why}. ${tail}` };
  }
  const headline = traitHeadline(link.trait, band);
  if (score === 2) return { score, text: `${headline}. ${name} ${link.why}, so it fits how you work.` };
  if (score === 1) return { score, text: `${headline}. ${name} ${link.why}, something you can grow into.` };
  return { score, text: `${headline}. ${name} ${link.why}, so it would stretch you. That can be a good thing if the subject interests you.` };
}

const SUGGESTION_COUNT = 4;

function suggestionsFor(
  links: readonly MajorTraitLink[],
  goal: "industry" | "grad_school",
  traits: TraitScores | null,
): MajorSuggestion[] {
  const because =
    goal === "industry" ? "you said your goal is industry work" : "you said your goal is graduate school";
  const ranked: { suggestion: MajorSuggestion; score: number; index: number }[] = [];
  links.forEach((link, index) => {
    const match = matchCatalog(link.name);
    if (!match || match.legacy) return;
    const personal = traits ? majorReason(link, match.name, traits) : null;
    ranked.push({
      index,
      score: personal?.score ?? 0,
      suggestion: {
        name: match.name,
        category: match.category,
        reason: personal?.text ?? `${match.name} is a strong option because ${because}.`,
      },
    });
  });
  const top = ranked
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, SUGGESTION_COUNT);
  if (!traits) return top.map((row) => row.suggestion);
  // Write the text in display order, so only the first major per trait repeats the trait line.
  const described = new Set<string>();
  return top.map((row) => {
    const link = links[row.index]!;
    const text = majorReason(link, row.suggestion.name, traits, described.has(link.trait)).text;
    described.add(link.trait);
    return { ...row.suggestion, reason: text };
  });
}

/**
 * Suggested majors follow the student's stated goal, ordered and described by
 * their quiz traits (founder decision, Nov 18, 2026). Confirmed majors stay
 * hidden until the student opts in.
 */
export function academicExploration(input: {
  source: AcademicSource;
  exploringMajors: boolean;
  goal: "industry" | "grad_school" | "undecided";
  traits?: TraitScores | null;
}): AcademicExploration {
  // Hidden for this audience (src/lib/audience.ts): no card, no note.
  if (!suggestsMajors) return { visible: false, note: "", suggestions: [] };
  const confirmed = input.source === "catalog" || input.source === "custom";
  const visible = input.source === "undecided" || (confirmed && input.exploringMajors);
  if (!visible) {
    return {
      visible: false,
      note: "Suggested majors stay hidden because you already chose a major. You can turn them on at the end of the quiz or on your profile. Career direction stays available.",
      suggestions: [],
    };
  }

  if (input.goal === "undecided") {
    return {
      visible: true,
      note: "Pick a goal on your profile and we'll suggest majors to explore.",
      suggestions: [],
    };
  }

  return {
    visible: true,
    note: input.traits
      ? "Picked from your goal and matched to your quiz."
      : "Picked from the goal you stated.",
    suggestions: suggestionsFor(input.goal === "industry" ? INDUSTRY_MAJORS : GRAD_MAJORS, input.goal, input.traits ?? null),
  };
}

export function isSelectableCatalogName(name: string, context: MajorSearchContext = {}): boolean {
  return matchCatalog(name, context) != null && name.trim().length > 0;
}

export type { CatalogMajor };
