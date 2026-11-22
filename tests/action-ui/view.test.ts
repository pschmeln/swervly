import { describe, expect, it } from "vitest";
import { filledDashboard } from "@/features/action-ui/mock";
import type { SkillView, TaskView } from "@/features/action-ui/types";
import {
  nextThree,
  phaseGroups,
  PROGRESS_COPY,
  READINESS_NOTE,
  showsAsSaved,
  skillGroups,
  weekFinishedSentence,
  weekSummary,
} from "@/features/action-ui/view";

const now = new Date("2026-11-18T15:00:00.000Z");

function task(partial: Partial<TaskView> & Pick<TaskView, "id" | "status" | "sortOrder">): TaskView {
  return {
    title: partial.id,
    description: null,
    phase: partial.phase ?? "prepare",
    origin: "template",
    originKey: partial.id,
    explanation: "Swervly suggestion",
    dueOn: null,
    completedAt: null,
    ...partial,
  };
}

describe("next three and milestones", () => {
  it("puts doing ahead of to-do and leaves done steps out", () => {
    const tasks = [
      task({ id: "todo-late", status: "todo", sortOrder: 5 }),
      task({ id: "done", status: "done", sortOrder: 0 }),
      task({ id: "todo-early", status: "todo", sortOrder: 1 }),
      task({ id: "doing", status: "doing", sortOrder: 4 }),
      task({ id: "todo-mid", status: "todo", sortOrder: 2 }),
    ];
    expect(nextThree(tasks).map((item) => item.id)).toEqual(["doing", "todo-early", "todo-mid"]);
  });

  it("counts only done steps inside a phase and parks tasks with no phase", () => {
    const tasks = [
      task({ id: "a", status: "done", sortOrder: 0, phase: "prepare" }),
      task({ id: "b", status: "doing", sortOrder: 1, phase: "prepare" }),
      task({ id: "c", status: "todo", sortOrder: 2, phase: null }),
    ];
    const groups = phaseGroups(tasks);
    expect(groups.map((group) => group.label)).toEqual(["Prepare", "Your own steps"]);
    expect(groups[0]).toMatchObject({ done: 1, total: 2 });
    expect(groups[1]).toMatchObject({ done: 0, total: 1 });
  });

  it("does not describe finished steps as career readiness", () => {
    expect(READINESS_NOTE).toMatch(/not a measure of career readiness/);
    expect(READINESS_NOTE.toLowerCase()).not.toContain("career ready");
  });
});

describe("skill groups", () => {
  const skills: SkillView[] = [
    { id: "1", name: "Programming", scope: "shared", evidence: "known", skillSource: "onet", progress: "comfortable", originKey: "a", explanation: "Listed for this occupation." },
    { id: "2", name: "Writing", scope: "shared", evidence: "known", skillSource: "onet", progress: "learning", originKey: "b", explanation: "Listed for this occupation." },
    { id: "3", name: "Reading", scope: "shared", evidence: "suggested", skillSource: "onet", progress: "unrated", originKey: "c", explanation: "Suggested." },
    { id: "4", name: "Skills not listed yet", scope: "optional_exploration", evidence: "unknown", skillSource: "editorial", progress: "unrated", originKey: "editorial:skills-unknown", explanation: "Missing data." },
  ];

  it("keeps unknown evidence out of the rating groups", () => {
    const board = skillGroups(skills);
    expect(board.unknown.map((skill) => skill.id)).toEqual(["4"]);
    expect(board.counts).toEqual({ comfortable: 1, learning: 1, unrated: 1 });
    expect(board.groups.map((group) => group.heading)).toEqual(["Comfortable", "Developing", "Not yet assessed"]);
    expect(board.groups.find((group) => group.progress === "unrated")?.note).toBe(PROGRESS_COPY.unrated);
    expect(PROGRESS_COPY.unrated).toMatch(/not the same as lacking the skill/);
    expect(PROGRESS_COPY.learning).toMatch(/not a deficit score/);
    expect(JSON.stringify(board.groups).toLowerCase()).not.toContain("you lack");
  });
});

describe("week summary copy", () => {
  it("counts steps completed this week in the student's zone", () => {
    const dashboard = filledDashboard(now, "America/New_York");
    const summary = weekSummary(dashboard.tasks, now, "America/New_York");
    expect(summary).toEqual({ finishedThisWeek: 1, doneTotal: 2 });
    expect(weekFinishedSentence(0)).toBe("Nothing finished this week yet.");
    expect(weekFinishedSentence(1)).toBe("1 step finished this week.");
    expect(weekFinishedSentence(2)).toBe("2 steps finished this week.");
    expect(weekFinishedSentence(1).toLowerCase()).not.toContain("hour");
  });
});

describe("saved notice", () => {
  it("is true only after a successful save", () => {
    expect(showsAsSaved("saved")).toBe(true);
    expect(showsAsSaved("error")).toBe(false);
    expect(showsAsSaved("saving")).toBe(false);
    expect(showsAsSaved("idle")).toBe(false);
  });
});
