import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AtlasExplorer } from "@/features/atlas/components/atlas-explorer";
import {
  compareFrom,
  comparePanel,
  compareReducer,
  directionColumn,
  DIRECTION_COLUMN_NOTE,
  EMPTY_SIDE_PROMPT,
  type CompareState,
} from "@/features/atlas/compare";
import { atlasEntry } from "@/features/atlas/entry";
import { atlasGraph } from "@/features/atlas/graph";
import type { AtlasNodeId } from "@/features/atlas/types";

// These tests cover every major and career, including those hidden from engineering students.
vi.mock("@/lib/audience", () => import("../helpers/audience-all"));

const graph = atlasGraph();
const MECH: AtlasNodeId = "occ:onet:17-2141.00";
const ROBOT: AtlasNodeId = "occ:onet:17-2199.08";
const NURSE: AtlasNodeId = "occ:onet:29-1141.00";
const SPEC: AtlasNodeId = "spec:test-validation";
const closed: CompareState = { left: null, right: null, open: false };

describe("compare state", () => {
  it("opens on the first Compare, with the clicked occupation on one side and the other side empty", () => {
    const state = compareReducer(closed, { type: "pick", id: MECH });
    expect(state).toEqual({ left: MECH, right: null, open: true });
  });

  it("fills the empty side next, then replaces the right side", () => {
    const one = compareReducer(closed, { type: "pick", id: MECH });
    const two = compareReducer(one, { type: "pick", id: ROBOT });
    expect(two).toEqual({ left: MECH, right: ROBOT, open: true });
    expect(compareReducer(two, { type: "pick", id: NURSE })).toEqual({ left: MECH, right: NURSE, open: true });
  });

  it("re-opens without changing anything when the occupation is already shown", () => {
    const shown: CompareState = { left: MECH, right: ROBOT, open: false };
    expect(compareReducer(shown, { type: "pick", id: ROBOT })).toEqual({ ...shown, open: true });
  });

  it("ignores anything that is not an occupation", () => {
    expect(compareReducer(closed, { type: "pick", id: SPEC })).toBe(closed);
  });

  it("clears one side, and closes once both sides are empty", () => {
    const both: CompareState = { left: MECH, right: ROBOT, open: true };
    const cleared = compareReducer(both, { type: "clear", side: "left" });
    expect(cleared).toEqual({ left: null, right: ROBOT, open: true });
    expect(compareReducer(cleared, { type: "clear", side: "right" })).toEqual(closed);
  });

  it("closes and keeps the picks for next time", () => {
    expect(compareReducer({ left: MECH, right: ROBOT, open: true }, { type: "close" })).toEqual({ left: MECH, right: ROBOT, open: false });
  });

  it("starts from occupations only, never the same one twice", () => {
    expect(compareFrom([SPEC, MECH, MECH])).toEqual({ left: MECH, right: null, open: true });
    expect(compareFrom([])).toEqual(closed);
  });
});

describe("compare panel", () => {
  it("offers related occupations that have a page for the empty side", () => {
    const model = comparePanel(graph, { left: MECH, right: null, open: true }, null);
    expect(model.right).toBeNull();
    expect(model.shared).toBeNull();
    expect(model.quickPicks.length).toBeGreaterThan(0);
    for (const pick of model.quickPicks) {
      expect(graph.nodes.get(pick.id)?.level).toBe("occupation");
      expect(pick.id).not.toBe(MECH);
    }
  });

  it("names what two filled sides share and stops offering picks", () => {
    const model = comparePanel(graph, { left: MECH, right: ROBOT, open: true }, null);
    expect(model.shared?.software).toContain("Dassault Systemes SolidWorks");
    expect(model.quickPicks).toEqual([]);
  });

  it("shows the chosen direction as a column that never depends on what is compared", () => {
    const a = comparePanel(graph, { left: MECH, right: null, open: true }, NURSE);
    const b = comparePanel(graph, { left: ROBOT, right: MECH, open: true }, NURSE);
    expect(a.direction).toEqual(b.direction);
    expect(a.direction).toMatchObject({ kind: "occupation", side: { title: "Registered Nurses" } });
  });

  it("describes a specialization direction by its summary and its occupations", () => {
    const column = directionColumn(graph, SPEC);
    expect(column?.kind).toBe("specialization");
    if (column?.kind !== "specialization") return;
    expect(column.summary.length).toBeGreaterThan(0);
    expect(column.occupations.length).toBeGreaterThan(0);
    expect(directionColumn(graph, "fam:finance")).toBeNull();
    expect(directionColumn(graph, null)).toBeNull();
  });
});

describe("compare in the explorer", () => {
  const entry = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });

  it("puts the panel right under the occupation's buttons, not at the bottom of the page", () => {
    const html = renderToStaticMarkup(
      <AtlasExplorer entry={entry} dismissedRoles={[]} initialFocus={MECH} initialCompare={[MECH]} />,
    );
    const panel = html.indexOf('id="compare-panel"');
    expect(panel).toBeGreaterThan(html.indexOf("Comparing ✓"));
    expect(panel).toBeLessThan(html.indexOf("Typical tasks"));
    expect(html).toContain(EMPTY_SIDE_PROMPT);
    expect(html).not.toContain("Clear compare");
  });

  it("adds the chosen direction as a third column", () => {
    const html = renderToStaticMarkup(
      <AtlasExplorer
        entry={entry}
        dismissedRoles={[]}
        initialFocus={MECH}
        initialCompare={[MECH]}
        saved={{ available: false, interested: [], dismissed: [], pursuing: SPEC, answers: {} }}
      />,
    );
    expect(html).toContain(DIRECTION_COLUMN_NOTE);
    expect(html).toContain("lg:grid-cols-3");
  });

  it("renders no panel until Compare is used", () => {
    const html = renderToStaticMarkup(<AtlasExplorer entry={entry} dismissedRoles={[]} initialFocus={MECH} />);
    expect(html).not.toContain('id="compare-panel"');
    expect(html).toContain(">Compare<");
  });
});
