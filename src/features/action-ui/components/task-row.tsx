import { Button, Select } from "@/components/ui";
import type { TaskStatus, TaskView } from "@/features/action-ui/types";
import { formatDue, STATUS_LABEL } from "@/features/action-ui/view";

export function TaskRow({
  task,
  pending,
  confirmingDelete,
  onStatus,
  onEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  task: TaskView;
  pending: boolean;
  confirmingDelete: boolean;
  onStatus: (status: TaskStatus) => void;
  onEdit: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const statusId = `status-${task.id}`;
  return (
    <li className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
      <p className="font-semibold break-words text-ink">{task.title}</p>
      {task.description ? <p className="mt-1 text-sm text-ink-2">{task.description}</p> : null}
      {task.explanation ? <p className="mt-1 text-sm text-ink-3">{task.explanation}</p> : null}
      {task.origin === "preserved" ? <p className="mt-1 text-sm font-semibold text-ink-3">Kept on this plan</p> : null}
      {task.dueOn ? <p className="mt-1 text-sm text-ink-2">Due {formatDue(task.dueOn)}</p> : null}
      <div className="mt-3 grid gap-2">
        <label htmlFor={statusId} className="text-sm font-semibold text-ink">
          Status
        </label>
        <Select
          id={statusId}
          value={task.status}
          disabled={pending}
          onChange={(value) => onStatus(value as TaskStatus)}
          options={(["todo", "doing", "done"] as const).map((status) => ({ value: status, label: STATUS_LABEL[status] }))}
        />
      </div>
      {confirmingDelete ? (
        <div className="mt-3 grid gap-2">
          <p className="text-ink">Delete “{task.title}”? This removes it from your plan.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={onConfirmDelete} disabled={pending} className="w-full sm:w-auto">
              Delete step
            </Button>
            <Button variant="secondary" onClick={onCancelDelete} className="w-full sm:w-auto">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" onClick={onEdit} disabled={pending} className="w-full sm:w-auto">
            Edit
          </Button>
          <Button variant="secondary" onClick={onAskDelete} disabled={pending} className="w-full sm:w-auto">
            Delete
          </Button>
        </div>
      )}
    </li>
  );
}
