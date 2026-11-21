"use client";

import { focusRing } from "@/components/ui/controls";
import { REVIEW_PROMPT_CHIPS } from "@/features/review/free-text-prompts";

/** Sentence-starter chips under the review note. Tapping one never submits or requires anything. */
export function FreeTextPromptChips({
  disabled,
  onInsert,
}: {
  disabled?: boolean;
  onInsert: (starter: string) => void;
}) {
  return (
    <div role="group" aria-label="Sentence starters for your note" className="flex flex-wrap gap-2">
      {REVIEW_PROMPT_CHIPS.map((chip) => (
        <button
          key={chip.label}
          type="button"
          disabled={disabled}
          aria-label={`Start with: ${chip.starter.trim()}…`}
          onClick={() => onInsert(chip.starter)}
          className={`min-h-12 rounded-full border border-neutral-200 bg-white px-4 text-sm font-medium text-ink hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`}
        >
          + {chip.label}
        </button>
      ))}
    </div>
  );
}
