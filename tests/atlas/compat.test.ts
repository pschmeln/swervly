import { describe, expect, it, vi } from "vitest";
import { ALL_ROLE_IDS, familiesForRole, ROLE_FAMILIES, rolesForFamily } from "@/features/atlas/compat";
import { atlasGraph } from "@/features/atlas/graph";

// These tests cover every major and career, including those hidden from engineering students.
vi.mock("@/lib/audience", () => import("../helpers/audience-all"));

const graph = atlasGraph();

describe("Direction role → Atlas family compatibility", () => {
  it("has exactly one entry for every existing Direction role id", () => {
    expect(Object.keys(ROLE_FAMILIES).sort()).toEqual([...ALL_ROLE_IDS].sort());
  });

  it("maps every role only to families that exist", () => {
    for (const families of Object.values(ROLE_FAMILIES)) {
      for (const familyId of families) expect(graph.nodes.get(familyId)?.level).toBe("family");
    }
  });

  it("never maps other or insufficient", () => {
    expect(familiesForRole("other")).toEqual([]);
    expect(familiesForRole("insufficient")).toEqual([]);
  });

  it("returns nothing for an unknown role instead of throwing", () => {
    expect(familiesForRole("not-a-role")).toEqual([]);
  });

  it("maps the design role to engineering design", () => {
    expect(familiesForRole("design")).toContain("fam:design-development");
    expect(rolesForFamily("fam:design-development")).toEqual(["design"]);
  });
});
