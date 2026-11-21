import { describe, expect, it } from "vitest";
import { resolveActionGoal } from "@/features/action/goal";
import { EDITORIAL_TASKS, TEMPLATE_VERSION, templateTasks } from "@/features/action/templates";
import { atlasGraph } from "@/features/atlas/graph";

const graph = atlasGraph();

describe("templateTasks", () => {
  it("seeds O*NET practice tasks for an occupation plus editorial steps", () => {
    const resolved = resolveActionGoal({ mode: "manual", nodeId: "occ:onet:17-2141.00" }, graph);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const tasks = templateTasks(resolved.goal);
    expect(TEMPLATE_VERSION).toBe("v1");
    expect(tasks.some((task) => task.originKey.startsWith("onet-task:"))).toBe(true);
    expect(tasks.filter((task) => task.originKey.startsWith("onet-task:")).length).toBeLessThanOrEqual(3);
    for (const editorial of EDITORIAL_TASKS) {
      expect(tasks.some((task) => task.originKey === editorial.originKey)).toBe(true);
    }
    for (const task of tasks) {
      expect(task.status).toBe("todo");
      expect(task.explanation.length).toBeGreaterThan(10);
    }
  });

  it("does not invent O*NET task mirrors for a specialization goal", () => {
    const resolved = resolveActionGoal({ mode: "manual", nodeId: "spec:test-validation" }, graph);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    const tasks = templateTasks(resolved.goal);
    expect(tasks.every((task) => !task.originKey.startsWith("onet-task:"))).toBe(true);
    expect(tasks.length).toBe(EDITORIAL_TASKS.length);
  });
});
