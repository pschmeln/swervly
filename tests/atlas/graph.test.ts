import { describe, expect, it } from "vitest";
import { ROLE_FAMILIES } from "@/features/atlas/compat";
import {
  atlasGraph,
  childrenOf,
  familiesBlockedByRoles,
  parentsOf,
  pathsTo,
  visibilityOf,
} from "@/features/atlas/graph";
import type { AtlasNodeId, FamilyId } from "@/features/atlas/types";

const graph = atlasGraph();
const noMarks = { dismissedNodes: [] as AtlasNodeId[], interestedNodes: [] as AtlasNodeId[], blockedFamilies: new Set<FamilyId>() };

describe("Career Atlas graph", () => {
  it("lets one occupation sit under several specializations", () => {
    const parents = parentsOf(graph, "occ:onet:17-2141.00").map((node) => node.id);
    expect(parents.length).toBeGreaterThanOrEqual(3);
    expect(parents).toContain("spec:structural-simulation");
    expect(parents).toContain("spec:cfd-simulation");
  });

  it("lists each child once even when it has several parents", () => {
    const children = childrenOf(graph, "fam:simulation-validation").map((node) => node.id);
    expect(new Set(children).size).toBe(children.length);
  });

  it("reaches Robotics Engineers from both engineering and computing", () => {
    const domains = new Set(pathsTo(graph, "occ:onet:17-2199.08").map((path) => path[0]));
    expect(domains.has("dom:engineering")).toBe(true);
    expect(domains.has("dom:computing")).toBe(true);
  });

  it("returns paths top-down, in a stable order", () => {
    const first = pathsTo(graph, "occ:onet:17-2141.00");
    const second = pathsTo(graph, "occ:onet:17-2141.00");
    expect(first).toEqual(second);
    for (const path of first) {
      expect(path[0].startsWith("dom:")).toBe(true);
      expect(path.at(-1)).toBe("occ:onet:17-2141.00");
    }
  });

  it("returns nothing for an unknown id", () => {
    expect(pathsTo(graph, "occ:onet:00-0000.00")).toEqual([]);
  });
});

describe("dismissal and interest", () => {
  const blockedByDesign = familiesBlockedByRoles(ROLE_FAMILIES, ["design"]);

  it("dismissing the design role blocks only families that design alone maps to", () => {
    expect(blockedByDesign.has("fam:design-development")).toBe(true);
    expect(blockedByDesign.has("fam:software-engineering")).toBe(false);
  });

  it("dims a specialization reached only through the dismissed role", () => {
    const marks = { ...noMarks, blockedFamilies: blockedByDesign };
    expect(visibilityOf(graph, "spec:robotics-mech-design", marks)).toBe("dimmed");
    expect(visibilityOf(graph, "fam:design-development", marks)).toBe("dimmed");
  });

  it("keeps an occupation visible when another path still reaches it", () => {
    const marks = { ...noMarks, blockedFamilies: blockedByDesign };
    // Robotics Engineers is also reached through Software Engineering → Robotics software.
    expect(visibilityOf(graph, "occ:onet:17-2199.08", marks)).toBe("visible");
  });

  it("hides a node the student dismissed, without touching its parents", () => {
    const marks = { ...noMarks, dismissedNodes: ["spec:cfd-simulation" as const] };
    expect(visibilityOf(graph, "spec:cfd-simulation", marks)).toBe("hidden");
    expect(visibilityOf(graph, "fam:simulation-validation", marks)).toBe("visible");
  });

  it("dims an occupation whose every path is dismissed", () => {
    const marks = { ...noMarks, dismissedNodes: ["spec:test-validation" as const, "spec:quality-engineering" as const] };
    expect(visibilityOf(graph, "occ:onet:17-2112.02", marks)).toBe("dimmed");
  });

  it("lets an explicit Interested win over an inherited dismissal", () => {
    const marks = { ...noMarks, blockedFamilies: blockedByDesign, interestedNodes: ["spec:robotics-mech-design" as const] };
    expect(visibilityOf(graph, "spec:robotics-mech-design", marks)).toBe("visible");
  });
});
