import { Button, Card, PageShell } from "@/components/ui";
import { AtlasExplorer } from "@/features/atlas/components/atlas-explorer";
import { atlasEntry } from "@/features/atlas/entry";
import { atlasGraph } from "@/features/atlas/graph";
import { loadAtlasState } from "@/features/atlas/server";
import { loadDirection } from "@/features/direction/server";
import { loadHomeArea } from "@/features/location/server";
import { isAtlasNodeId } from "@/features/atlas/view";
import { requireOnboardedUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Career map" };

/**
 * Career Atlas. Reads only the student's catalog major, major source and Direction
 * role marks (dismissed / Interested). Custom major text is never passed in.
 */
export default async function CareerAtlasPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string | string[] }>;
}) {
  const user = await requireOnboardedUser();
  const params = await searchParams;
  const at = typeof params.at === "string" ? params.at : null;
  const graph = atlasGraph();
  const initialFocus = at && isAtlasNodeId(at) && graph.nodes.has(at) ? at : null;
  const entry = atlasEntry(graph, { major: user.major, majorSource: user.majorSource });

  // Reuse Direction's own output: its current suggestions and its consented, n >= 2 student evidence.
  // Atlas never recomputes evidence or reads anyone else's reviews directly.
  let directionSuggested: string[] = [];
  let evidence: { role: string; roleLabel: string; sampleSize: number }[] = [];
  try {
    const direction = await loadDirection(user);
    if (direction) {
      directionSuggested = direction.suggestions.map((item) => item.roleType).filter((role) => role !== "insufficient");
      evidence = direction.suggestions
        .filter((item) => item.source === "similar_students" && (item.sampleSize ?? 0) >= 2)
        .map((item) => ({ role: item.roleType, roleLabel: item.roleLabel, sampleSize: item.sampleSize ?? 0 }));
    }
  } catch {
    // Atlas still works without Direction; it just has fewer signals.
  }
  // Saved choices for this student only. Unavailable (on-screen only) until migration 0007 is applied.
  const [saved, homeArea] = await Promise.all([loadAtlasState(user.id), loadHomeArea(user.id)]);

  return (
    <PageShell title="Career map" description="Browse careers from your major outward, or anywhere you like.">
      <AtlasExplorer
        entry={entry}
        dismissedRoles={[...user.dismissedCareerRoles]}
        interestedRoles={[...user.interestedCareerRoles]}
        directionSuggested={directionSuggested}
        evidence={evidence}
        saved={saved}
        initialFocus={initialFocus}
        homeArea={homeArea}
      />
    </PageShell>
  );
}
