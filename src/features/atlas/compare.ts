import { ONET_DETAILS } from "@/content/atlas/onet-details";
import { childrenOf, type AtlasGraph } from "@/features/atlas/graph";
import { levelOf, type AtlasNodeId } from "@/features/atlas/types";
import { compareSide, type CompareSide } from "@/features/atlas/view";

/**
 * Compare in the career map. Two sides the student fills, plus the student's
 * chosen direction as a fixed third column. Pure functions: the explorer keeps
 * the state, and tests drive these directly.
 */

export type CompareSlot = "left" | "right";

export type CompareState = {
  left: AtlasNodeId | null;
  right: AtlasNodeId | null;
  open: boolean;
};

export type CompareAction =
  | { type: "pick"; id: AtlasNodeId }
  | { type: "clear"; side: CompareSlot }
  | { type: "close" };

export const EMPTY_SIDE_PROMPT = "Pick another occupation to compare";
export const EMPTY_SIDE_HINT = "Open any occupation in the map and tap Compare, or pick one of these:";
export const DIRECTION_COLUMN_NOTE = "Stays here while you compare. It changes only when you change your direction.";

const MAX_QUICK_PICKS = 5;

function isOccupation(id: AtlasNodeId): boolean {
  return levelOf(id) === "occupation";
}

/** State for tests and previews that start with occupations already picked. */
export function compareFrom(initial: readonly AtlasNodeId[]): CompareState {
  const picks = initial.filter(isOccupation);
  const left = picks[0] ?? null;
  const right = picks.find((id) => id !== left) ?? null;
  return { left, right, open: left !== null || right !== null };
}

/**
 * pick: opens the panel. The occupation fills the first empty side; when both
 * sides are full it replaces the right side. Picking one already shown just opens.
 * clear: empties one side. Clearing the last one closes the panel.
 * close: hides the panel and keeps the picks for next time.
 */
export function compareReducer(state: CompareState, action: CompareAction): CompareState {
  if (action.type === "close") return { ...state, open: false };
  if (action.type === "clear") {
    const next = { ...state, [action.side]: null };
    return next.left === null && next.right === null ? { ...next, open: false } : next;
  }
  if (!isOccupation(action.id)) return state;
  if (state.left === action.id || state.right === action.id) return { ...state, open: true };
  if (state.left === null) return { ...state, left: action.id, open: true };
  return { ...state, right: action.id, open: true };
}

export type DirectionColumn =
  | { kind: "occupation"; side: CompareSide }
  | {
      kind: "specialization";
      id: AtlasNodeId;
      title: string;
      summary: string;
      occupations: { id: AtlasNodeId; title: string }[];
    };

/** The chosen direction as a column. It depends only on the direction, never on what is compared. */
export function directionColumn(graph: AtlasGraph, pursuing: AtlasNodeId | null): DirectionColumn | null {
  if (!pursuing) return null;
  const level = levelOf(pursuing);
  if (level === "occupation") {
    const side = compareSide(graph, pursuing);
    return side ? { kind: "occupation", side } : null;
  }
  if (level === "specialization") {
    const spec = graph.data.specializations.find((item) => item.id === pursuing);
    if (!spec) return null;
    return {
      kind: "specialization",
      id: spec.id,
      title: spec.title,
      summary: spec.summary,
      occupations: childrenOf(graph, spec.id)
        .filter((node) => node.level === "occupation")
        .map((node) => ({ id: node.id, title: node.title })),
    };
  }
  return null;
}

export type ComparePanelModel = {
  left: CompareSide | null;
  right: CompareSide | null;
  /** What the two sides share. Null until both sides are filled. */
  shared: { skills: string[]; software: string[]; areas: string[] } | null;
  direction: DirectionColumn | null;
  /** Occupations with a page that O*NET lists as related to the filled side, for the empty side. */
  quickPicks: { id: AtlasNodeId; title: string }[];
};

function relatedWithPages(graph: AtlasGraph, side: CompareSide): { id: AtlasNodeId; title: string }[] {
  const record = ONET_DETAILS[side.onetCode];
  if (!record) return [];
  return record.related
    .map((item) => ({ id: `occ:onet:${item.onetCode}` as AtlasNodeId, title: item.title }))
    .filter((item) => item.id !== side.id && graph.nodes.has(item.id))
    .slice(0, MAX_QUICK_PICKS);
}

export function comparePanel(
  graph: AtlasGraph,
  state: CompareState,
  pursuing: AtlasNodeId | null,
): ComparePanelModel {
  const left = state.left ? compareSide(graph, state.left) : null;
  const right = state.right ? compareSide(graph, state.right) : null;
  const both = (a: readonly string[], b: readonly string[]) => a.filter((item) => b.includes(item));
  const filled = left ?? right;
  return {
    left,
    right,
    shared:
      left && right
        ? { skills: both(left.skills, right.skills), software: both(left.software, right.software), areas: both(left.areas, right.areas) }
        : null,
    direction: directionColumn(graph, pursuing),
    quickPicks: filled && !(left && right) ? relatedWithPages(graph, filled) : [],
  };
}
