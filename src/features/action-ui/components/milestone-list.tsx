import { Button, Card } from "@/components/ui";
import { TaskForm, draftFromTask, emptyDraft, type TaskDraft } from "@/features/action-ui/components/task-form";
import { TaskRow } from "@/features/action-ui/components/task-row";
import type { TaskStatus, TaskView } from "@/features/action-ui/types";
import { phaseCountSentence, phaseGroups, READINESS_NOTE } from "@/features/action-ui/view";

export function MilestoneList({
  tasks,
  pending,
  editingId,
  adding,
  deletingId,
  onStatus,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
  onAdd,
  onCancelAdd,
  onCreate,
  onRegister,
}: {
  tasks: readonly TaskView[];
  pending: boolean;
  editingId: string | null;
  adding: boolean;
  deletingId: string | null;
  onStatus: (id: string, status: TaskStatus) => void;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string, draft: TaskDraft) => void;
  onAskDelete: (id: string) => void;
  onConfirmDelete: (id: string) => void;
  onCancelDelete: () => void;
  onAdd: () => void;
  onCancelAdd: () => void;
  onCreate: (draft: TaskDraft) => void;
  onRegister: (submit: () => void) => void;
}) {
  const groups = phaseGroups(tasks);
  return (
    <Card>
      <div id="steps">
        <h2 className="text-lg font-semibold text-ink">Steps</h2>
        <p className="mt-1 text-sm text-ink-2">{READINESS_NOTE}</p>
        {groups.length === 0 ? <p className="mt-4 text-ink-2">No steps yet. Add one of your own.</p> : null}
        <div className="mt-4 grid gap-5">
          {groups.map((group) => {
            const sentence = phaseCountSentence(group.done, group.total, group.label);
            const width = group.total === 0 ? 0 : Math.round((group.done / group.total) * 100);
            return (
              <section key={group.id}>
                <h3 className="font-semibold text-ink">{group.label}</h3>
                <p className="mt-1 text-sm text-ink-2">{sentence}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#2f6bff] to-[#7c5cff]" style={{ width: `${width}%` }} />
                </div>
                <ul className="mt-3 grid gap-2.5">
                  {group.tasks.map((task) =>
                    editingId === task.id ? (
                      <li key={task.id} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                        <TaskForm
                          initial={draftFromTask(task)}
                          submitLabel="Save step"
                          pending={pending}
                          showStatus
                          onSubmit={(draft) => onSaveEdit(task.id, draft)}
                          onCancel={onCancelEdit}
                          onRegister={onRegister}
                        />
                      </li>
                    ) : (
                      <TaskRow
                        key={task.id}
                        task={task}
                        pending={pending}
                        confirmingDelete={deletingId === task.id}
                        onStatus={(status) => onStatus(task.id, status)}
                        onEdit={() => onEdit(task.id)}
                        onAskDelete={() => onAskDelete(task.id)}
                        onConfirmDelete={() => onConfirmDelete(task.id)}
                        onCancelDelete={onCancelDelete}
                      />
                    ),
                  )}
                </ul>
              </section>
            );
          })}
        </div>
        <div id="add-step" className="mt-5">
          {adding ? (
            <TaskForm
              initial={emptyDraft()}
              submitLabel="Add step"
              pending={pending}
              showStatus={false}
              onSubmit={onCreate}
              onCancel={onCancelAdd}
              onRegister={onRegister}
            />
          ) : (
            <Button onClick={onAdd} disabled={pending} className="w-full sm:w-auto">
              Add a step
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
