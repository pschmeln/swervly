import { describe, expect, it } from "vitest";
import { isValidActionGoalId, resolveActionGoal } from "@/features/action/goal";
import { ResolveGoalInput } from "@/features/action/schemas";
import { atlasGraph } from "@/features/atlas/graph";

const graph = atlasGraph();
const OCC = "occ:onet:17-2141.00";
const SPEC = "spec:test-validation";
const FAMILY = "fam:finance";

describe("resolveActionGoal", () => {
  it("uses Atlas pursuing when present", () => {
    const result = resolveActionGoal({ mode: "atlas_pursuing" }, { graph, atlasPursuing: OCC });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.goal).toMatchObject({
      nodeId: OCC,
      level: "occupation",
      source: "atlas_pursuing",
      onetCode: "17-2141.00",
    });
    expect(result.goal.title.length).toBeGreaterThan(0);
  });

  it("allows a manual specialization when the student has no pursuing mark", () => {
    const noPursuing = resolveActionGoal({ mode: "atlas_pursuing" }, { graph, atlasPursuing: null });
    expect(noPursuing).toMatchObject({ ok: false, code: "no_pursuing" });

    const manual = resolveActionGoal({ mode: "manual", nodeId: SPEC }, { graph });
    expect(manual.ok).toBe(true);
    if (!manual.ok) return;
    expect(manual.goal).toMatchObject({ nodeId: SPEC, level: "specialization", source: "manual", onetCode: null });
  });

  it("refuses families, domains, and unknown ids", () => {
    expect(resolveActionGoal({ mode: "manual", nodeId: FAMILY }, { graph })).toMatchObject({
      ok: false,
      code: "invalid_level",
    });
    expect(resolveActionGoal({ mode: "manual", nodeId: "occ:onet:00-0000.00" }, { graph })).toMatchObject({
      ok: false,
      code: "unknown_node",
    });
  });

  it("validates zod input shapes and refuses a client node on atlas_pursuing", () => {
    expect(ResolveGoalInput.parse({ mode: "manual", nodeId: OCC }).mode).toBe("manual");
    expect(ResolveGoalInput.parse({ mode: "atlas_pursuing" }).mode).toBe("atlas_pursuing");
    expect(() => ResolveGoalInput.parse({ mode: "manual", nodeId: FAMILY })).toThrow();
    expect(() => ResolveGoalInput.parse({ mode: "atlas_pursuing", pursuingNodeId: OCC })).toThrow();
    expect(isValidActionGoalId(OCC, graph)).toBe(true);
    expect(isValidActionGoalId(FAMILY, graph)).toBe(false);
  });
});
