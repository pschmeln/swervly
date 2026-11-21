import { atlasGraph, type AtlasGraph } from "@/features/atlas/graph";
import { levelOf, type AtlasNodeId } from "@/features/atlas/types";
import type { ResolveGoalInput } from "@/features/action/schemas";
import { isGoalLevel, type ActionGoal, type GoalLevel } from "@/features/action/types";

export type GoalResolveResult =
  | { ok: true; goal: ActionGoal }
  | { ok: false; code: "no_pursuing" | "unknown_node" | "invalid_level"; message: string };

function buildGoal(
  graph: AtlasGraph,
  nodeId: AtlasNodeId,
  source: ActionGoal["source"],
): GoalResolveResult {
  const node = graph.nodes.get(nodeId);
  if (!node) {
    return { ok: false, code: "unknown_node", message: "That career is not in the map." };
  }
  if (!isGoalLevel(node.level)) {
    return {
      ok: false,
      code: "invalid_level",
      message: "Choose a specialization or an occupation as your Action goal.",
    };
  }
  const level: GoalLevel = node.level;
  const occupation = level === "occupation" ? graph.data.occupations.find((item) => item.id === nodeId) : null;
  return {
    ok: true,
    goal: {
      nodeId,
      level,
      title: node.title,
      onetCode: occupation?.onetCode ?? null,
      source,
    },
  };
}

/**
 * Resolve the Action goal from Atlas pursuing (preferred) or a manual pick.
 * Does not write marks — manual choice is Action-local until persistence exists.
 */
export function resolveActionGoal(
  input: ResolveGoalInput,
  graph: AtlasGraph = atlasGraph(),
): GoalResolveResult {
  if (input.mode === "atlas_pursuing") {
    if (!input.pursuingNodeId) {
      return {
        ok: false,
        code: "no_pursuing",
        message: "No direction is set on the career map yet. Pick a goal here, or set one in Atlas.",
      };
    }
    return buildGoal(graph, input.pursuingNodeId as AtlasNodeId, "atlas_pursuing");
  }
  return buildGoal(graph, input.nodeId as AtlasNodeId, "manual");
}

/** True when a node id is an allowed Action goal on this graph. */
export function isValidActionGoalId(nodeId: string, graph: AtlasGraph = atlasGraph()): boolean {
  const level = levelOf(nodeId);
  if (!level || !isGoalLevel(level)) return false;
  return graph.nodes.has(nodeId as AtlasNodeId);
}
