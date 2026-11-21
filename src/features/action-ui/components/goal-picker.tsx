"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Field, TextInput } from "@/components/ui";
import { focusRing } from "@/components/ui/controls";
import { searchGoals } from "@/features/action-ui/catalog";
import type { GoalOption, PursuingDisplay } from "@/features/action-ui/types";
import { GOAL_CHANGE_CARRYOVER, GOAL_CHANGE_WARNING, horizonSentence, hoursSentence, NO_PURSUING_MESSAGE } from "@/features/action-ui/view";
import { ROUTES } from "@/lib/constants";

function wholeOrNull(raw: string): number | null {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

export function GoalPicker({
  pursuing,
  mode,
  pending,
  initialHours = "",
  initialWeeks = "",
  onAtlas,
  onManual,
  onCancel,
  onRegister,
}: {
  pursuing: PursuingDisplay | null;
  mode: "seed" | "change";
  pending: boolean;
  initialHours?: string;
  initialWeeks?: string;
  onAtlas: (hours: string, weeks: string) => void;
  onManual: (nodeId: string, hours: string, weeks: string) => void;
  onCancel?: () => void;
  onRegister?: (submit: () => void) => void;
}) {
  const searchId = useId();
  const hoursId = useId();
  const weeksId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<GoalOption | null>(null);
  const [hours, setHours] = useState(initialHours);
  const [weeks, setWeeks] = useState(initialWeeks);
  const results = searchGoals(query);
  const hoursRef = useRef(hours);
  const weeksRef = useRef(weeks);
  const selectedRef = useRef(selected);
  const modeRef = useRef<"atlas" | "manual" | null>(null);
  useEffect(() => {
    hoursRef.current = hours;
    weeksRef.current = weeks;
    selectedRef.current = selected;
    onRegister?.(() => {
      if (modeRef.current === "manual" && selectedRef.current) {
        onManual(selectedRef.current.nodeId, hoursRef.current, weeksRef.current);
      } else if (modeRef.current === "atlas") {
        onAtlas(hoursRef.current, weeksRef.current);
      }
    });
  }, [hours, weeks, selected, onAtlas, onManual, onRegister]);
  const levelLabel = pursuing?.level === "occupation" ? "Occupation" : "Specialization";

  return (
    <div className="grid gap-4">
      {mode === "change" ? (
        <div>
          <h2 id="change-goal-title" tabIndex={-1} className="text-lg font-semibold text-ink outline-none">
            Change goal
          </h2>
          <p className="mt-2 text-ink-2">{GOAL_CHANGE_WARNING}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold text-ink">Choose a career to work toward</h2>
          <p className="mt-2 text-ink-2">Pick a specialization or an occupation. You can edit every step afterward.</p>
        </div>
      )}

      {pursuing ? (
        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-ink-3">Direction on your career map</p>
          <p className="mt-1 font-semibold text-ink">{pursuing.title}</p>
          <p className="text-sm text-ink-3">{levelLabel}</p>
          <Button
            onClick={() => {
              modeRef.current = "atlas";
              onAtlas(hours, weeks);
            }}
            disabled={pending}
            className="mt-3 w-full sm:w-auto"
          >
            {mode === "change" ? "Use the direction on my career map" : "Start from this direction"}
          </Button>
        </div>
      ) : (
        <p className="text-ink-2">{NO_PURSUING_MESSAGE}</p>
      )}

      <Field label="Search careers" htmlFor={searchId} hint="Alphabetical names from the career map, not a ranked recommendation.">
        <TextInput
          id={searchId}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
          placeholder="Type a career or specialization"
          autoComplete="off"
        />
      </Field>
      {query.trim().length > 0 ? (
        results.length > 0 ? (
          <ul className="grid max-h-64 gap-2 overflow-y-auto">
            {results.map((item) => {
              const pressed = selected?.nodeId === item.nodeId;
              return (
                <li key={item.nodeId}>
                  <button
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => setSelected(item)}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left ${focusRing} ${
                      pressed ? "border-ink bg-white" : "border-neutral-200 bg-white"
                    }`}
                  >
                    <span className="font-medium text-ink">{item.title}</span>
                    <span className="shrink-0 text-sm text-ink-3">{item.level === "occupation" ? "Occupation" : "Specialization"}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-ink-2">No matching specialization or occupation.</p>
        )
      ) : (
        <p className="text-sm text-ink-3">Type a career or specialization.</p>
      )}
      <Button
        onClick={() => {
          if (!selected) return;
          modeRef.current = "manual";
          onManual(selected.nodeId, hours, weeks);
        }}
        disabled={pending || !selected}
        className="w-full sm:w-auto"
      >
        {mode === "change" ? "Use this career" : "Start with this career"}
      </Button>

      {mode === "change" ? (
        <p className="text-sm text-ink-2">
          {hoursSentence(wholeOrNull(initialHours))} {horizonSentence(wholeOrNull(initialWeeks))} {GOAL_CHANGE_CARRYOVER}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Weekly hours" htmlFor={hoursId} hint={mode === "change" ? "Leave blank to keep the current hours. 1–40. Time set aside, not hours worked." : "Optional. 1–40. This is time you set aside, not hours worked."}>
          <TextInput id={hoursId} inputMode="numeric" value={hours} onChange={(event) => setHours(event.target.value)} />
        </Field>
        <Field label="Horizon in weeks" htmlFor={weeksId} hint={mode === "change" ? "Leave blank to keep the current horizon. 1–52." : "Optional. 1–52."}>
          <TextInput id={weeksId} inputMode="numeric" value={weeks} onChange={(event) => setWeeks(event.target.value)} />
        </Field>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
        ) : (
          <Button href={ROUTES.directionAtlas} variant="secondary" className="w-full sm:w-auto">
            Open the career map
          </Button>
        )}
      </div>
    </div>
  );
}
