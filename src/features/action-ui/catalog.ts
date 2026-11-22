import { atlasGraph } from "@/features/atlas/graph";
import { isGoalNodeId } from "@/features/action-ui/adapter";
import type { GoalOption } from "@/features/action-ui/types";

/**
 * Alphabetical career list for the manual picker. This is not a ranked recommendation.
 * Uses the student-facing map, so careers hidden for the audience (src/lib/audience.ts) are left out.
 */
export function goalCatalog(): GoalOption[] {
  const { specializations, occupations } = atlasGraph().data;
  const options: GoalOption[] = [
    ...specializations.map((item) => ({ nodeId: item.id, title: item.title, level: "specialization" as const })),
    ...occupations.map((item) => ({ nodeId: item.id, title: item.title, level: "occupation" as const })),
  ];
  return options.filter((item) => isGoalNodeId(item.nodeId)).sort((a, b) => a.title.localeCompare(b.title) || a.nodeId.localeCompare(b.nodeId));
}

export function searchGoals(query: string, catalog: readonly GoalOption[] = goalCatalog(), limit = 12): GoalOption[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];
  return catalog.filter((item) => item.title.toLowerCase().includes(q)).slice(0, limit);
}

export function goalById(nodeId: string, catalog: readonly GoalOption[] = goalCatalog()): GoalOption | null {
  return catalog.find((item) => item.nodeId === nodeId) ?? null;
}
