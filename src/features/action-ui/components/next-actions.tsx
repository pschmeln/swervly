import { Button, Card } from "@/components/ui";
import type { TaskView } from "@/features/action-ui/types";
import { READINESS_NOTE, STATUS_LABEL } from "@/features/action-ui/view";

export function NextActions({
  tasks,
  pending,
  onStatus,
}: {
  tasks: readonly TaskView[];
  pending: boolean;
  onStatus: (id: string, status: "done") => void;
}) {
  return (
    <Card>
      <div id="next">
        <h2 className="text-lg font-semibold text-ink">Your next three steps</h2>
        <p className="mt-1 text-sm text-ink-2">{READINESS_NOTE}</p>
        {tasks.length === 0 ? (
          <div className="mt-4">
            <p className="text-ink">You’ve finished the steps on this plan.</p>
            <p className="mt-1 text-ink-2">Add a step of your own whenever you want.</p>
            <a href="#add-step" className="mt-3 inline-flex min-h-12 items-center font-semibold text-accent underline-offset-4 hover:underline">
              Add a step
            </a>
          </div>
        ) : (
          <ol className="mt-4 grid gap-2.5">
            {tasks.map((task, index) => (
              <li key={task.id} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-ink-3">
                  {index + 1} · {STATUS_LABEL[task.status]}
                </p>
                <p className="mt-1 font-semibold break-words text-ink">{task.title}</p>
                {task.explanation ? <p className="mt-1 text-sm text-ink-3">{task.explanation}</p> : null}
                {task.status !== "done" ? (
                  <Button onClick={() => onStatus(task.id, "done")} disabled={pending} className="mt-3 w-full sm:w-auto">
                    Mark done
                  </Button>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}
