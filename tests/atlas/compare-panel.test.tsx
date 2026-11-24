import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ComparePanel } from "@/features/atlas/components/compare-panel";
import { CHOOSE_PROMPT, comparePanel, GROUPING_SOURCE_LABEL, ONET_SOURCE_LABEL } from "@/features/atlas/compare";
import { atlasGraph } from "@/features/atlas/graph";
import type { AtlasNodeId } from "@/features/atlas/types";

vi.mock("@/lib/audience", () => import("../helpers/audience-all"));

const graph = atlasGraph();
const MECH: AtlasNodeId = "occ:onet:17-2141.00";
const ROBOT: AtlasNodeId = "occ:onet:17-2199.08";
const noop = () => {};

function render(pursuing: AtlasNodeId | null, right: AtlasNodeId | null = ROBOT) {
  const model = comparePanel(graph, { left: MECH, right, open: true }, pursuing);
  return renderToStaticMarkup(
    <ComparePanel model={model} pursuing={pursuing} onPick={noop} onClear={noop} onChoose={noop} onClose={noop} />,
  );
}

describe("Compare panel (V1-07)", () => {
  it("labels O*NET content and Swervly's own grouping on each side", () => {
    const html = render(null);
    expect(html.split(ONET_SOURCE_LABEL).length - 1).toBe(2);
    expect(html).toContain(GROUPING_SOURCE_LABEL);
  });

  it("lets the student choose one of the two as their direction", () => {
    const html = render(null);
    expect(html.match(/Make this my direction/g)).toHaveLength(2);
    expect(html).toContain(CHOOSE_PROMPT);
  });

  it("marks the side that is already the student's direction", () => {
    const html = render(MECH);
    expect(html).toContain("My direction ✓");
    expect(html).toContain('aria-pressed="true"');
    expect(html.match(/Make this my direction/g)).toHaveLength(1);
  });

  it("asks for a choice only once both sides are filled", () => {
    expect(render(null, null)).not.toContain(CHOOSE_PROMPT);
  });
});
