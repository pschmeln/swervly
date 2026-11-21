import { describe, expect, it } from "vitest";
import { resolveActionGoal } from "@/features/action/goal";
import { reviseActivePlanSeed, seedAfterGoalChange } from "@/features/action/plan-change";
import { TemplatePlanningService } from "@/features/action/planning-service";
import { atlasGraph } from "@/features/atlas/graph";

const graph = atlasGraph();

describe("seedAfterGoalChange", () => {
  it("seeds a fresh plan only — does not carry completed tasks from the old goal", async () => {
    const firstGoal = resolveActionGoal({ mode: "manual", nodeId: "occ:onet:17-2141.00" }, { graph });
    const secondGoal = resolveActionGoal({ mode: "manual", nodeId: "spec:test-validation" }, { graph });
    expect(firstGoal.ok && secondGoal.ok).toBe(true);
    if (!firstGoal.ok || !secondGoal.ok) return;

    const service = new TemplatePlanningService(graph);
    const nextDraft = await service.draftPlan({
      userId: "u1",
      goal: secondGoal.goal,
      profile: { major: null, majorSource: null, year: null, lifeGoal: null },
    });

    const seed = seedAfterGoalChange(nextDraft);
    expect(seed.seededTasks.every((task) => task.status === "todo")).toBe(true);
    expect(seed.seededTasks.some((task) => task.origin === "preserved")).toBe(false);
    expect(seed.seededSkills.every((skill) => skill.originKey.length > 0)).toBe(true);
    // Archived plan keeps prior completed work; this seed is independent.
    expect(seed.seededTasks.length).toBe(nextDraft.tasks.length);
  });
});

describe("reviseActivePlanSeed", () => {
  it("preserves existing origin_keys and only inserts missing template rows", async () => {
    const resolved = resolveActionGoal({ mode: "manual", nodeId: "occ:onet:17-2141.00" }, { graph });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const draft = await new TemplatePlanningService(graph).draftPlan({
      userId: "u1",
      goal: resolved.goal,
      profile: { major: null, majorSource: null, year: null, lifeGoal: null },
    });

    const existingTasks = [
      { originKey: "editorial:resume", status: "done" as const },
      { originKey: draft.tasks[0]?.originKey ?? "onet-task:0", status: "doing" as const },
    ];
    const existingSkills = [draft.skills[0]?.originKey].filter(Boolean) as string[];

    const revise = reviseActivePlanSeed(existingTasks, existingSkills, draft);
    expect(revise.tasksToInsert.some((task) => task.originKey === "editorial:resume")).toBe(false);
    expect(revise.skillsToInsert.some((skill) => skill.originKey === existingSkills[0])).toBe(false);
    expect(revise.tasksToInsert.length).toBeLessThan(draft.tasks.length);
  });
});
