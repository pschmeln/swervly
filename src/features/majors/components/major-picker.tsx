"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Field, TextInput } from "@/components/ui";
import {
  CUSTOM_MAJOR_PROMPT,
  matchCatalog,
  searchMajors,
  UNDECIDED_LABEL,
  type MajorSearchContext,
} from "@/features/majors/catalog";
import type { MajorPickerValue } from "@/features/majors/selection";
import { offersUndecided } from "@/lib/audience";

type Option =
  | { kind: "undecided"; key: string; label: string; detail: string }
  | { kind: "custom"; key: string; label: string; detail: string }
  | { kind: "catalog"; key: string; label: string; detail: string; name: string };

const controlClass =
  "min-h-12 w-full rounded-xl border border-neutral-300 bg-white px-3 text-left text-base text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

export function MajorPicker({
  id,
  value,
  onChange,
  disabled,
  error,
  context,
}: {
  id: string;
  value: MajorPickerValue;
  onChange: (value: MajorPickerValue) => void;
  disabled?: boolean;
  error?: string;
  context?: MajorSearchContext;
}) {
  const listId = useId();
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const options = useMemo(() => buildOptions(query ?? "", context ?? {}), [query, context]);
  const selectedLabel =
    value.source === "undecided"
      ? UNDECIDED_LABEL
      : value.source === "catalog"
        ? value.name
        : "";
  const shown = query ?? selectedLabel;
  const customMatch = value.source === "custom" ? matchCatalog(value.name, context ?? {}) : null;
  const matchedListed = customMatch && !customMatch.legacy ? customMatch : null;

  function choose(option: Option) {
    if (option.kind === "undecided") onChange({ source: "undecided", name: "" });
    else if (option.kind === "custom") onChange({ source: "custom", name: value.source === "custom" ? value.name : "" });
    else onChange({ source: "catalog", name: option.name });
    setQuery(null);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActive((current) => Math.min(current + 1, Math.max(options.length - 1, 0)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActive((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter" && open && options[active]) {
      event.preventDefault();
      choose(options[active]);
    } else if (event.key === "Escape") {
      setOpen(false);
      setQuery(null);
    }
  }

  return (
    <div className="grid gap-3">
      <Field label="Major" htmlFor={id} error={error} hint={offersUndecided ? "Search the list, pick Undecided, or enter a major that is missing." : "Search the list, or enter a major that is missing."}>
        <TextInput
          id={id}
          name="major"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          disabled={disabled}
          placeholder="Search majors"
          value={shown}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => setOpen(false)}
        />
      </Field>
      {open && !disabled ? (
        <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto rounded-xl border border-neutral-300 bg-white">
          {options.length === 0 ? (
            <li className="px-3 py-3 text-sm text-neutral-600">No matches. You can enter your major below.</li>
          ) : null}
          {options.map((option, index) => (
            <li key={option.key} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                className={`${controlClass} rounded-none border-0 ${index === active ? "bg-neutral-100" : ""}`}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span className="block">{option.label}</span>
                <span className="block text-xs text-neutral-600">{option.detail}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {value.source === "undecided" ? (
        <p className="text-sm text-neutral-700">Undecided is saved as its own status. It is not a major.</p>
      ) : null}
      {value.source === "custom" ? (
        <Field
          label="Your major"
          htmlFor={`${id}-custom`}
          hint={matchedListed ? `This matches ${matchedListed.name}. We'll save that listed major.` : "Only you can see this until a founder approves it for the list."}
        >
          <TextInput
            id={`${id}-custom`}
            name="customMajor"
            disabled={disabled}
            maxLength={120}
            value={value.name}
            onChange={(event) => onChange({ source: "custom", name: event.target.value })}
          />
        </Field>
      ) : null}
    </div>
  );
}

function buildOptions(query: string, context: MajorSearchContext): Option[] {
  const normalized = query.trim().toLowerCase();
  const showUndecided =
    offersUndecided &&
    (normalized.length === 0 ||
    "undecided".includes(normalized) ||
    "not sure".includes(normalized) ||
    UNDECIDED_LABEL.toLowerCase().includes(normalized));
  const majors = searchMajors(query, context);
  const options: Option[] = [];
  if (showUndecided) {
    options.push({ kind: "undecided", key: "undecided", label: UNDECIDED_LABEL, detail: "Not a major" });
  }
  for (const major of majors) {
    options.push({
      kind: "catalog",
      key: `major:${major.name}`,
      label: major.name,
      detail: major.category,
      name: major.name,
    });
  }
  options.push({
    kind: "custom",
    key: "custom",
    label: CUSTOM_MAJOR_PROMPT,
    detail: "Save it on your profile now. It stays off the public list until a founder approves it.",
  });
  return options;
}
