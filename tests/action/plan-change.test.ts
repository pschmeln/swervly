import { describe, expect, it } from "vitest";
import { resolveActionGoal } from "@/features/action/goal";
import { orderedTasksForNewPlan, tasksAfterGoalChange } from "@/features/action/plan-change";
import { TemplatePlanningService } from "@/features/action/planning-service";
import { atlasGraph } from "@/features/atlas/graph";

const graph = atlasGraph();

describe("tasksAfterGoalChange", () => {
  it("preserves completed tasks when the goal changes and does not re-seed the same template keys", async () => {
    const firstGoal = resolveActionGoal({ mode: "manual", nodeId: "occ:onet:17-2141.00" }, graph);
    const secondGoal = resolveActionGoal({ mode: "manual", nodeId: "spec:test-validation" }, graph);
    expect(firstGoal.ok && secondGoal.ok).toBe(true);
    if (!firstGoal.ok || !secondGoal.ok) return;

    const service = new TemplatePlanningService(graph);
    const firstDraft = await service.draftPlan({
      userId: "u1",
      goal: firstGoal.goal,
      profile: { major: null, majorSource: null, year: null, lifeGoal: null },
    });
    const nextDraft = await service.draftPlan({
      userId: "u1",
      goal: secondGoal.goal,
      profile: { major: null, majorSource: null, year: null, lifeGoal: null },
    });

    const previous = firstDraft.tasks.map((task, index) => ({
      title: index === 0 ? "Custom completed title" : task.title,
      status: index === 0 || task.originKey === "editorial:resume" ? ("done" as const) : ("todo" as const),
      originKey: task.originKey,
      explanation: task.explanation,
    }));

    const change = tasksAfterGoalChange(previous, nextDraft);
    expect(change.preservedCompleted.length).toBe(2);
    expect(change.preservedCompleted.every((task) => task.status === "done")).toBe(true);
    expect(change.preservedCompleted.some((task) => task.title === "Custom completed title")).toBe(true);
    expect(change.seededTasks.some((task) => task.originKey === "editorial:resume")).toBe(false);

    const ordered = orderedTasksForNewPlan(change);
    expect(ordered.filter((task) => task.status === "done").length).toBe(2);
    expect(ordered.some((task) => task.status === "todo")).toBe(true);
  });
});
