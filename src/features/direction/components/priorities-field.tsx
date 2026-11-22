"use client";

import { Checkbox, ErrorNote } from "@/components/ui";
import { MAX_PRIORITIES, PRIORITY_OPTIONS, type Priority } from "@/features/direction/priorities";

/** "Pick up to 3 things that matter most in a co-op" (D8). Optional. */
export function PrioritiesField({
  value,
  onChange,
  error,
  disabled,
}: {
  value: readonly Priority[];
  onChange: (value: Priority[]) => void;
  error?: string;
  disabled?: boolean;
}) {
  const full = value.length >= MAX_PRIORITIES;
  return (
    <fieldset className="grid gap-1">
      <legend className="text-sm font-semibold text-ink">What matters most to you in a co-op?</legend>
      <p className="text-sm text-ink-3">
        Optional. Pick up to {MAX_PRIORITIES}. Direction uses them to explain its suggestions with real student ratings.
      </p>
      {PRIORITY_OPTIONS.map((option) => {
        const checked = value.includes(option.value);
        return (
          <Checkbox
            key={option.value}
            id={`priority-${option.value}`}
            name="priorities"
            checked={checked}
            disabled={disabled || (!checked && full)}
            onChange={(event) =>
              onChange(event.target.checked ? [...value, option.value] : value.filter((item) => item !== option.value))
            }
            label={option.label}
          />
        );
      })}
      <p className="text-sm text-ink-3" aria-live="polite">
        {value.length} of {MAX_PRIORITIES} picked
      </p>
      {error ? <ErrorNote>{error}</ErrorNote> : null}
    </fieldset>
  );
}
