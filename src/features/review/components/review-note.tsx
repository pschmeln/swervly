"use client";

import { useEffect, useState } from "react";
import { Checkbox, ErrorNote, Field, Textarea } from "@/components/ui";
import { FreeTextPromptChips } from "@/features/review/components/free-text-prompts";
import { FREE_TEXT_MAX, insertStarter, placeholderAt, PROMPT_ROTATE_MS } from "@/features/review/free-text-prompts";

/** The optional note, its prompt chips, and "OK to show this text". */
export function ReviewNote({
  value,
  shared,
  disabled,
  noteError,
  shareError,
  onNoteChange,
  onSharedChange,
}: {
  value: string;
  shared: boolean;
  disabled: boolean;
  noteError: string | undefined;
  shareError: string | undefined;
  onNoteChange: (value: string) => void;
  onSharedChange: (shared: boolean) => void;
}) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const empty = value.length === 0;
  const hasText = value.trim().length > 0;

  // Rotate the placeholder question while the note is empty and not being typed in.
  // Students who ask for reduced motion keep the first question.
  useEffect(() => {
    if (!empty || focused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setPromptIndex((index) => index + 1), PROMPT_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [empty, focused]);

  function insert(starter: string) {
    const next = insertStarter(value, starter);
    if (next === value) return;
    onNoteChange(next);
    window.setTimeout(() => {
      const note = document.getElementById("freeText");
      if (note instanceof HTMLTextAreaElement) {
        note.focus();
        note.setSelectionRange(next.length, next.length);
      }
    }, 0);
  }

  return (
    <>
      <Field
        label="Anything a student considering this co-op should know?"
        htmlFor="freeText"
        hint="Optional. Tap a prompt below to get started."
        error={noteError}
      >
        <Textarea
          id="freeText"
          name="freeText"
          value={value}
          disabled={disabled}
          maxLength={FREE_TEXT_MAX}
          placeholder={placeholderAt(promptIndex)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(event) => onNoteChange(event.target.value)}
        />
      </Field>
      <FreeTextPromptChips disabled={disabled} onInsert={insert} />

      <div className="flex flex-col gap-1.5">
        <Checkbox
          id="shareFreeText"
          name="shareFreeText"
          label="It's OK to show this text to other students without my name."
          checked={hasText && shared}
          disabled={disabled || !hasText}
          onChange={(event) => onSharedChange(event.target.checked)}
        />
        {shareError ? <ErrorNote>{shareError}</ErrorNote> : null}
      </div>
    </>
  );
}
