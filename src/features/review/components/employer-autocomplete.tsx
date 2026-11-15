"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ErrorNote, TextInput } from "@/components/ui";
import { ROUTES } from "@/lib/constants";
import { readApiJson } from "@/features/review/components/api-client";

export type EmployerOption = {
  id: string;
  name: string;
  city: string | null;
};

type EmployerAutocompleteProps = {
  value: EmployerOption | null;
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (employer: EmployerOption) => void;
  error?: string;
  disabled?: boolean;
};

export function EmployerAutocomplete({
  value,
  query,
  onQueryChange,
  onSelect,
  error,
  disabled,
}: EmployerAutocompleteProps) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<EmployerOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>();
  const requestIdRef = useRef(0);

  const trimmed = query.trim();
  const selectedExact = Boolean(value && value.name === query);
  const canSearch = trimmed.length >= 2 && !selectedExact;
  const visibleSuggestions = canSearch ? suggestions : [];

  useEffect(() => {
    if (!canSearch) return;

    const timer = window.setTimeout(() => {
      const requestId = ++requestIdRef.current;
      const q = trimmed;
      void (async () => {
        setSearching(true);
        try {
          const response = await fetch(
            `${ROUTES.employers}?q=${encodeURIComponent(q)}`,
          );
          const result = await readApiJson<EmployerOption[]>(response);
          if (requestId !== requestIdRef.current) return;
          if (result.ok) {
            setSuggestions(result.data);
            setLocalError(undefined);
          } else {
            setSuggestions([]);
            setLocalError(result.error.message);
          }
        } catch {
          if (requestId !== requestIdRef.current) return;
          setSuggestions([]);
          setLocalError("Could not search employers.");
        } finally {
          if (requestId === requestIdRef.current) setSearching(false);
        }
      })();
    }, 250);

    return () => {
      window.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [canSearch, trimmed]);

  async function addEmployer() {
    const name = query.trim();
    if (name.length < 2 || adding || disabled) return;

    setAdding(true);
    setLocalError(undefined);
    try {
      const response = await fetch(ROUTES.employers, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await readApiJson<EmployerOption>(response);
      if (!result.ok) {
        setLocalError(result.error.fields?.name ?? result.error.message);
        return;
      }
      requestIdRef.current += 1;
      onSelect({
        id: result.data.id,
        name: result.data.name,
        city: result.data.city ?? null,
      });
      setSuggestions([]);
    } catch {
      setLocalError("Could not add employer.");
    } finally {
      setAdding(false);
    }
  }

  const showAdd =
    trimmed.length >= 2 &&
    !selectedExact &&
    !visibleSuggestions.some(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
    );

  const shownError = error ?? localError;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="employer" className="text-sm font-medium text-neutral-900">
        Employer
      </label>
      <TextInput
        id="employer"
        name="employer"
        autoComplete="off"
        role="combobox"
        aria-expanded={visibleSuggestions.length > 0}
        aria-controls={listId}
        value={query}
        disabled={disabled || adding}
        placeholder="Start typing an employer"
        onChange={(event) => {
          onQueryChange(event.target.value);
        }}
      />
      {canSearch && searching ? (
        <p className="text-sm text-neutral-600">Searching…</p>
      ) : null}
      {visibleSuggestions.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="max-h-48 overflow-auto rounded-lg border border-neutral-300 bg-white"
        >
          {visibleSuggestions.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                role="option"
                aria-selected={value?.id === item.id}
                className="flex min-h-12 w-full items-center px-3 text-left text-base text-neutral-900 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-inset"
                onClick={() => {
                  requestIdRef.current += 1;
                  onSelect(item);
                  setSuggestions([]);
                  setLocalError(undefined);
                }}
              >
                <span>
                  {item.name}
                  {item.city ? (
                    <span className="text-neutral-600"> · {item.city}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {showAdd ? (
        <button
          type="button"
          className="min-h-12 rounded-lg border border-dashed border-neutral-300 px-3 text-left text-base text-neutral-900 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || adding}
          onClick={() => void addEmployer()}
        >
          {adding ? "Adding…" : `Can't find it? Add '${trimmed}'`}
        </button>
      ) : null}
      {shownError ? <ErrorNote>{shownError}</ErrorNote> : null}
    </div>
  );
}
