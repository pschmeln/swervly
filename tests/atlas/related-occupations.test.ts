import { describe, expect, it, vi } from "vitest";
import { OCCUPATIONS } from "@/content/atlas/occupations";
import { ONET_DETAILS } from "@/content/atlas/onet-details";
import { atlasGraph } from "@/features/atlas/graph";
import { atlasEntry } from "@/features/atlas/entry";
import { nodeModel } from "@/features/atlas/view";
import type { AtlasNodeId } from "@/features/atlas/types";

// These tests cover every major and career, including those hidden from engineering students.
vi.mock("@/lib/audience", () => import("../helpers/audience-all"));

const graph = atlasGraph();
const codes = new Set(OCCUPATIONS.map((occupation) => occupation.onetCode));
const ORIGINAL = OCCUPATIONS.slice(0, 110);

describe("related occupations one level out (item 7, D6)", () => {
  it("has 292 occupations, each with O*NET details", () => {
    expect(OCCUPATIONS).toHaveLength(292);
    for (const occupation of OCCUPATIONS) expect(ONET_DETAILS[occupation.onetCode], occupation.onetCode).toBeDefined();
  });

  it("gives every occupation the first 110 pages link to a page of its own", () => {
    for (const occupation of ORIGINAL) {
      for (const related of ONET_DETAILS[occupation.onetCode]!.related) {
        expect(codes.has(related.onetCode), `${occupation.onetCode} → ${related.onetCode}`).toBe(true);
      }
    }
  });

  it("sends any related occupation still without a page to O*NET OnLine", () => {
    const me = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
    let outside = 0;
    for (const occupation of OCCUPATIONS) {
      const id = occupation.id as AtlasNodeId;
      const trail = [id];
      const view = nodeModel(graph, me, id, trail, { interested: [], dismissed: [] }, []);
      for (const item of view?.details?.related ?? []) {
        if (item.id) {
          expect(item.href).toBeNull();
        } else {
          outside += 1;
          expect(item.href).toMatch(/^https:\/\/www\.onetonline\.org\/link\/summary\/\d{2}-\d{4}\.\d{2}$/);
        }
      }
    }
    expect(outside).toBeGreaterThan(0);
  });
});
