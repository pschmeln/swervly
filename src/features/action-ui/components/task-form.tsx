"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button, Field, Select, Textarea, TextInput } from "@/components/ui";
import { ACTION_LIMITS, TASK_STATUSES } from "@/features/action/types";
import type { TaskDraft } from "@/features/action-ui/task-draft";
import type { TaskPhase, TaskStatus } from "@/features/action-ui/types";
import { PHASES, STATUS_LABEL } from "@/features/action-ui/view";

export function TaskForm({
  initial,
  submitLabel,
  pending,
  showStatus,
  onSubmit,
  onCancel,
  onRegister,
}: {
  initial: TaskDraft;
  submitLabel: string;
  pending: boolean;
  showStatus: boolean;
  onSubmit: (draft: TaskDraft) => void;
  onCancel: () => void;
  onRegister?: (submit: () => void) => void;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const phaseId = useId();
  const dueId = useId();
  const statusId = useId();
  const [draft, setDraft] = useState(initial);
  const draftRef = useRef(draft);
  useEffect(() => {
    draftRef.current = draft;
    onRegister?.(() => onSubmit(draftRef.current));
  }, [draft, onRegister, onSubmit]);

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(draft);
      }}
    >
      <Field label="Title" htmlFor={titleId}>
        <TextInput
          id={titleId}
          value={draft.title}
          maxLength={ACTION_LIMITS.titleMax}
          onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        />
      </Field>
      <Field label="Notes" htmlFor={descriptionId}>
        <Textarea
          id={descriptionId}
          value={draft.description}
          maxLength={ACTION_LIMITS.descriptionMax}
          onChange={(event) => setDraft({ ...draft, description: event.target.value })}
        />
      </Field>
      <Field label="Where it fits" htmlFor={phaseId}>
        <Select
          id={phaseId}
          value={draft.phase}
          onChange={(value) => setDraft({ ...draft, phase: value as TaskPhase | "" })}
          options={[{ value: "", label: "No phase" }, ...PHASES.map((phase) => ({ value: phase.id, label: phase.label }))]}
        />
      </Field>
      <Field label="Due date" htmlFor={dueId} hint="Optional.">
        <TextInput id={dueId} type="date" value={draft.dueOn} onChange={(event) => setDraft({ ...draft, dueOn: event.target.value })} />
      </Field>
      {showStatus ? (
        <Field label="Status" htmlFor={statusId}>
          <Select
            id={statusId}
            value={draft.status}
            onChange={(value) => setDraft({ ...draft, status: value as TaskStatus })}
            options={TASK_STATUSES.map((status) => ({ value: status, label: STATUS_LABEL[status] }))}
          />
        </Field>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} className="w-full sm:w-auto">
          Cancel
        </Button>
      </div>
    </form>
  );
}
