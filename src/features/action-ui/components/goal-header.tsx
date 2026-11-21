"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Card, Field, TextInput } from "@/components/ui";
import type { DashboardView } from "@/features/action-ui/types";
import { horizonSentence, hoursSentence, sourceLabel } from "@/features/action-ui/view";

export function GoalHeader({
  dashboard,
  pending,
  onSave,
  onChangeGoal,
  onRegister,
}: {
  dashboard: DashboardView;
  pending: boolean;
  onSave: (hours: string, weeks: string) => void;
  onChangeGoal: () => void;
  onRegister: (submit: () => void) => void;
}) {
  const hoursId = useId();
  const weeksId = useId();
  const savedKey = `${dashboard.planId}:${dashboard.weeklyHours ?? ""}:${dashboard.horizonWeeks ?? ""}`;
  const [seen, setSeen] = useState(savedKey);
  const [hours, setHours] = useState(dashboard.weeklyHours?.toString() ?? "");
  const [weeks, setWeeks] = useState(dashboard.horizonWeeks?.toString() ?? "");
  if (seen !== savedKey) {
    setSeen(savedKey);
    setHours(dashboard.weeklyHours?.toString() ?? "");
    setWeeks(dashboard.horizonWeeks?.toString() ?? "");
  }
  const hoursRef = useRef(hours);
  const weeksRef = useRef(weeks);
  useEffect(() => {
    hoursRef.current = hours;
    weeksRef.current = weeks;
    onRegister(() => onSave(hoursRef.current, weeksRef.current));
  }, [hours, weeks, onRegister, onSave]);

  return (
    <Card>
      <p className="text-sm font-semibold text-ink-3">{sourceLabel(dashboard.goalSource)}</p>
      <h2 className="mt-1 text-lg font-semibold text-ink">Your goal</h2>
      <p className="mt-1 text-xl font-semibold tracking-tight text-ink">{dashboard.goalTitle}</p>
      <p className="mt-2 text-sm text-ink-2">
        {hoursSentence(dashboard.weeklyHours)} {horizonSentence(dashboard.horizonWeeks)}
      </p>
      <form
        className="mt-4 grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(hours, weeks);
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Weekly hours" htmlFor={hoursId} hint="1–40, or blank to clear. Time set aside, not hours worked.">
            <TextInput id={hoursId} inputMode="numeric" value={hours} onChange={(event) => setHours(event.target.value)} />
          </Field>
          <Field label="Horizon in weeks" htmlFor={weeksId} hint="1–52, or blank to clear.">
            <TextInput id={weeksId} inputMode="numeric" value={weeks} onChange={(event) => setWeeks(event.target.value)} />
          </Field>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="submit" disabled={pending} className="w-full sm:w-auto">
            Save settings
          </Button>
          <Button id="change-goal" type="button" variant="secondary" onClick={onChangeGoal} disabled={pending} className="w-full sm:w-auto">
            Change goal
          </Button>
        </div>
      </form>
    </Card>
  );
}
