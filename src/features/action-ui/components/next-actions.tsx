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
            {tasks.map((task, index) => {
              const first = index === 0;
              return (
                <li
                  key={task.id}
                  className={
                    first
                      ? "rounded-2xl border-2 border-ink bg-white px-4 py-4 shadow-[0_8px_20px_rgba(11,18,32,0.08)]"
                      : "rounded-2xl border border-neutral-200 bg-white px-4 py-3"
                  }
                >
                  <p className={first ? "text-sm font-semibold text-ink" : "text-sm font-semibold text-ink-3"}>
                    {first ? "Do this next" : `${index + 1} · ${STATUS_LABEL[task.status]}`}
                    {first ? <span className="ml-2 font-medium text-ink-3">{STATUS_LABEL[task.status]}</span> : null}
                  </p>
                  <p className={`mt-1 break-words font-semibold text-ink ${first ? "text-xl leading-snug" : ""}`}>{task.title}</p>
                  {task.explanation ? <p className="mt-1 text-sm text-ink-3">{task.explanation}</p> : null}
                  {task.status !== "done" ? (
                    <Button
                      onClick={() => onStatus(task.id, "done")}
                      disabled={pending}
                      variant={first ? "primary" : "secondary"}
                      className="mt-4 w-full sm:w-auto"
                    >
                      {first ? "Mark this done" : "Mark done"}
                    </Button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}
