import { OCCUPATIONS } from "@/content/atlas/occupations";
import { SPECIALIZATIONS } from "@/content/atlas/taxonomy";
import { isGoalNodeId } from "@/features/action-ui/adapter";
import type { GoalOption } from "@/features/action-ui/types";

/** Alphabetical career list for the manual picker. This is not a ranked recommendation. */
export function goalCatalog(): GoalOption[] {
  const options: GoalOption[] = [
    ...SPECIALIZATIONS.map((item) => ({ nodeId: item.id, title: item.title, level: "specialization" as const })),
    ...OCCUPATIONS.map((item) => ({ nodeId: item.id, title: item.title, level: "occupation" as const })),
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
