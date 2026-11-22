"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ErrorNote, TextInput } from "@/components/ui";
import { readApiJson } from "@/features/review/components/api-client";
import { ROUTES } from "@/lib/constants";

export type PlaceOption = { geoid: string; label: string };

/** Searchable US city field. Results come from GET /api/places (Census places). */
export function PlaceSearch({
  id,
  label,
  hint,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  value: PlaceOption | null;
  onChange: (value: PlaceOption | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const hintId = useId();
  const [query, setQuery] = useState(value?.label ?? "");
  const [options, setOptions] = useState<PlaceOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | undefined>();
  const [noMatch, setNoMatch] = useState(false);
  const requestRef = useRef(0);

  const trimmed = query.trim();
  const canSearch = trimmed.length >= 2 && trimmed !== value?.label;
  const shown = canSearch ? options : [];

  useEffect(() => {
    if (!canSearch) return;
    const timer = window.setTimeout(() => {
      const request = ++requestRef.current;
      void (async () => {
        setSearching(true);
        try {
          const response = await fetch(`${ROUTES.places}?q=${encodeURIComponent(trimmed)}`);
          const result = await readApiJson<PlaceOption[]>(response);
          if (request !== requestRef.current) return;
          setOptions(result.ok ? result.data : []);
          setNoMatch(result.ok && result.data.length === 0);
          setSearchError(result.ok ? undefined : result.error.message);
        } catch {
          if (request !== requestRef.current) return;
          setOptions([]);
          setSearchError("Could not search cities. Check your connection and try again.");
        } finally {
          if (request === requestRef.current) setSearching(false);
        }
      })();
    }, 250);
    return () => {
      window.clearTimeout(timer);
      requestRef.current += 1;
    };
  }, [canSearch, trimmed]);

  const shownError = error ?? searchError;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-ink-3">
          {hint}
        </p>
      ) : null}
      <TextInput
        id={id}
        name={id}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown.length > 0}
        aria-controls={listId}
        aria-describedby={hint ? hintId : undefined}
        aria-invalid={shownError ? true : undefined}
        value={query}
        disabled={disabled}
        placeholder="Start typing a city, like Dayton, OH"
        onChange={(event) => {
          setQuery(event.target.value);
          setNoMatch(false);
          if (value && event.target.value !== value.label) onChange(null);
        }}
      />
      {canSearch && searching ? <p className="text-sm text-ink-3">Searching…</p> : null}
      {canSearch && !searching && noMatch ? (
        <p className="text-sm text-ink-3">No US city or town matches that. Try the nearest larger one.</p>
      ) : null}
      {shown.length > 0 ? (
        <ul id={listId} role="listbox" aria-label={`${label} matches`} className="max-h-60 overflow-auto rounded-xl border border-neutral-300 bg-white">
          {shown.map((option) => (
            <li key={option.geoid}>
              <button
                type="button"
                role="option"
                aria-selected={value?.geoid === option.geoid}
                className="flex min-h-12 w-full items-center px-3 text-left text-base text-ink hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                onClick={() => {
                  requestRef.current += 1;
                  setQuery(option.label);
                  setOptions([]);
                  setSearchError(undefined);
                  onChange(option);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {shownError ? <ErrorNote>{shownError}</ErrorNote> : null}
    </div>
  );
}
