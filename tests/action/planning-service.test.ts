import { describe, expect, it } from "vitest";
import { resolveActionGoal } from "@/features/action/goal";
import { TemplatePlanningService } from "@/features/action/planning-service";
import { atlasGraph } from "@/features/atlas/graph";

const graph = atlasGraph();

describe("TemplatePlanningService", () => {
  it("drafts a plan without calling any AI provider", async () => {
    const resolved = resolveActionGoal({ mode: "manual", nodeId: "occ:onet:17-2141.00" }, graph);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;

    const service = new TemplatePlanningService(graph);
    const draft = await service.draftPlan({
      userId: "00000000-0000-4000-8000-000000000001",
      goal: resolved.goal,
      profile: { major: "Mechanical Engineering", majorSource: "catalog", year: 3, lifeGoal: "industry" },
    });

    expect(draft.source).toBe("template_v1");
    expect(draft.goal.nodeId).toBe(resolved.goal.nodeId);
    expect(draft.skills.length).toBeGreaterThan(0);
    expect(draft.tasks.length).toBeGreaterThan(0);
    expect(draft.skills.every((skill) => skill.explanation.length > 0)).toBe(true);
    expect(draft.tasks.every((task) => task.explanation.length > 0)).toBe(true);
  });

  it("is deterministic for the same goal", async () => {
    const resolved = resolveActionGoal({ mode: "atlas_pursuing", pursuingNodeId: "spec:test-validation" }, graph);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const service = new TemplatePlanningService(graph);
    const ctx = {
      userId: "user-a",
      goal: resolved.goal,
      profile: { major: null, majorSource: "undecided", year: null, lifeGoal: "undecided" as const },
    };
    const a = await service.draftPlan(ctx);
    const b = await service.draftPlan(ctx);
    expect(a).toEqual(b);
  });
});
