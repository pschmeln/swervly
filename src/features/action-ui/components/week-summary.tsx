import { Card } from "@/components/ui";
import type { TaskView } from "@/features/action-ui/types";
import { horizonSentence, hoursSentence, READINESS_NOTE, weekFinishedSentence, weekSummary } from "@/features/action-ui/view";

export function WeekSummary({
  tasks,
  weeklyHours,
  horizonWeeks,
  now = new Date(),
}: {
  tasks: readonly TaskView[];
  weeklyHours: number | null;
  horizonWeeks: number | null;
  now?: Date;
}) {
  const summary = weekSummary(tasks, now);
  return (
    <Card>
      <div id="week">
        <h2 className="text-lg font-semibold text-ink">This week</h2>
        <p className="mt-2 text-ink">{weekFinishedSentence(summary.finishedThisWeek)}</p>
        <p className="mt-1 text-sm text-ink-2">
          {summary.doneTotal === 1 ? "1 step marked done on this plan." : `${summary.doneTotal} steps marked done on this plan.`}
        </p>
        <p className="mt-2 text-sm text-ink-2">
          {hoursSentence(weeklyHours)} {horizonSentence(horizonWeeks)}
        </p>
        <p className="mt-2 text-sm text-ink-2">{READINESS_NOTE}</p>
      </div>
    </Card>
  );
}
