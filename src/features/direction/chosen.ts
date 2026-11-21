import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { careerAtlasMarks } from "@/db/schema";
import { atlasGraph } from "@/features/atlas/graph";
import { atlasPrototypeEnabled } from "@/features/atlas/prototype";
import { levelOf, type AtlasNodeId } from "@/features/atlas/types";
import { ROUTES } from "@/lib/constants";

/**
 * The student's chosen direction: the one career map node marked "pursuing"
 * (career_atlas_marks, at most one per student, a specialization or an occupation).
 */
export type ChosenDirection = {
  nodeId: AtlasNodeId;
  title: string;
  level: "specialization" | "occupation";
  /** Opens the career map at this node, where the student can change or stop pursuing it. */
  href: string;
};

/** Pure: a stored node id to what the screens show. Null for ids no longer in the map. */
export function chosenDirectionView(nodeId: string | null | undefined): ChosenDirection | null {
  if (!nodeId) return null;
  const level = levelOf(nodeId);
  if (level !== "specialization" && level !== "occupation") return null;
  const node = atlasGraph().nodes.get(nodeId as AtlasNodeId);
  if (!node) return null;
  return {
    nodeId: node.id,
    title: node.title,
    level,
    href: `${ROUTES.directionAtlas}?at=${encodeURIComponent(node.id)}`,
  };
}

/**
 * The signed-in student's chosen direction, or null. Scoped to `userId`, which callers
 * take from requireUser(). Null when the career map is switched off or the read fails.
 */
export async function loadChosenDirection(userId: string): Promise<ChosenDirection | null> {
  if (!userId || !atlasPrototypeEnabled()) return null;
  try {
    const [row] = await db
      .select({ nodeId: careerAtlasMarks.nodeId })
      .from(careerAtlasMarks)
      .where(and(eq(careerAtlasMarks.userId, userId), eq(careerAtlasMarks.mark, "pursuing")))
      .limit(1);
    return chosenDirectionView(row?.nodeId);
  } catch {
    return null;
  }
}
