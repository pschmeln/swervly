import type { SkillProgress, SkillView, TaskPhase, TaskStatus, TaskView } from "@/features/action-ui/types";
import { isInLocalWeek, studentTimeZone } from "@/features/action-ui/week";

/** Same sentences as progressLabel in PR #50. Missing a rating is not a lack. */
export const PROGRESS_COPY: Record<SkillProgress, string> = {
  learning: "You're building this — not a deficit score.",
  comfortable: "You marked yourself comfortable with this.",
  unrated: "Not rated yet. Missing a rating is not the same as lacking the skill.",
};

export const PROGRESS_HEADING: Record<SkillProgress, string> = {
  comfortable: "Comfortable",
  learning: "Developing",
  unrated: "Not yet assessed",
};

export const READINESS_NOTE = "Finished steps are not a measure of career readiness.";

export const NO_PURSUING_MESSAGE = "No direction is set on the career map yet. Pick a goal here, or set one in Atlas.";

export const ACTION_UNAVAILABLE_MESSAGE = "Action plans are not available on this database yet.";

export const NOTHING_SAVED = "Something went wrong. Nothing was saved.";

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "To do",
  doing: "Doing",
  done: "Done",
};

export const PHASES: readonly { id: TaskPhase; label: string }[] = [
  { id: "practice", label: "Practice" },
  { id: "prepare", label: "Prepare" },
  { id: "explore", label: "Explore" },
  { id: "reflect", label: "Reflect" },
];

export const GOAL_CHANGE_WARNING =
  "This replaces your active plan. The plan you have now is kept as history and won't show here. The new plan starts with new steps, and skill ratings start over as not yet assessed.";

/** Blank hours or horizon on a goal change keep the previous plan's settings. */
export const GOAL_CHANGE_CARRYOVER = "Your current hours and horizon carry over unless you change them.";

const PROGRESS_ORDER: readonly SkillProgress[] = ["comfortable", "learning", "unrated"];

export function showsAsSaved(status: "idle" | "saving" | "saved" | "error"): boolean {
  return status === "saved";
}

/** Doing first, then to-do, in plan order. Done steps stay in the milestone lists. */
export function nextThree(tasks: readonly TaskView[]): TaskView[] {
  return tasks
    .filter((task) => task.status === "doing" || task.status === "todo")
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === "doing" ? -1 : 1;
      return a.sortOrder - b.sortOrder;
    })
    .slice(0, 3);
}

export type PhaseGroup = {
  id: TaskPhase | "unsorted";
  label: string;
  tasks: TaskView[];
  done: number;
  total: number;
};

export function phaseGroups(tasks: readonly TaskView[]): PhaseGroup[] {
  const groups: PhaseGroup[] = [];
  for (const phase of PHASES) {
    const items = tasks.filter((task) => task.phase === phase.id);
    if (items.length === 0) continue;
    groups.push({
      id: phase.id,
      label: phase.label,
      tasks: items,
      done: items.filter((task) => task.status === "done").length,
      total: items.length,
    });
  }
  const unsorted = tasks.filter((task) => task.phase == null);
  if (unsorted.length > 0) {
    groups.push({
      id: "unsorted",
      label: "Your own steps",
      tasks: unsorted,
      done: unsorted.filter((task) => task.status === "done").length,
      total: unsorted.length,
    });
  }
  return groups;
}

export function phaseCountSentence(done: number, total: number, label: string): string {
  const steps = total === 1 ? "step" : "steps";
  return `${done} of ${total} ${steps} done in ${label}.`;
}

export type SkillGroups = {
  unknown: SkillView[];
  counts: Record<SkillProgress, number>;
  groups: { progress: SkillProgress; heading: string; note: string; skills: SkillView[] }[];
};

/** evidence "unknown" is missing career data, not a skill the student failed to have. */
export function skillGroups(skills: readonly SkillView[]): SkillGroups {
  const unknown = skills.filter((skill) => skill.evidence === "unknown");
  const rated = skills.filter((skill) => skill.evidence !== "unknown");
  const counts = {
    comfortable: rated.filter((skill) => skill.progress === "comfortable").length,
    learning: rated.filter((skill) => skill.progress === "learning").length,
    unrated: rated.filter((skill) => skill.progress === "unrated").length,
  };
  const groups = PROGRESS_ORDER.map((progress) => ({
    progress,
    heading: PROGRESS_HEADING[progress],
    note: PROGRESS_COPY[progress],
    skills: rated.filter((skill) => skill.progress === progress),
  })).filter((group) => group.skills.length > 0);
  return { unknown, counts, groups };
}

export function weekFinishedSentence(count: number): string {
  if (count === 0) return "Nothing finished this week yet.";
  if (count === 1) return "1 step finished this week.";
  return `${count} steps finished this week.`;
}

export function hoursSentence(hours: number | null): string {
  if (hours == null) return "No weekly hours set.";
  if (hours === 1) return "1 hour a week set aside.";
  return `${hours} hours a week set aside.`;
}

export function horizonSentence(weeks: number | null): string {
  if (weeks == null) return "No time horizon set.";
  if (weeks === 1) return "Looking ahead 1 week.";
  return `Looking ahead ${weeks} weeks.`;
}

export function formatDue(dueOn: string): string {
  const [year, month, day] = dueOn.split("-").map(Number);
  if (!year || !month || !day) return dueOn;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(year, month - 1, day));
}

export type WeekSummary = { finishedThisWeek: number; doneTotal: number };

/** Steps marked done whose completedAt falls in the local Monday–Sunday week. */
export function weekSummary(tasks: readonly TaskView[], now: Date, timeZone: string = studentTimeZone()): WeekSummary {
  const done = tasks.filter((task) => task.status === "done");
  return {
    finishedThisWeek: done.filter((task) => isInLocalWeek(task.completedAt, now, timeZone)).length,
    doneTotal: done.length,
  };
}

export function sourceLabel(source: "atlas_pursuing" | "manual"): string {
  return source === "atlas_pursuing" ? "From your career map" : "Chosen here";
}
