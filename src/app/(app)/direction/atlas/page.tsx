import { Button, Card, PageShell } from "@/components/ui";
import { AtlasExplorer } from "@/features/atlas/components/atlas-explorer";
import { atlasEntry } from "@/features/atlas/entry";
import { atlasGraph } from "@/features/atlas/graph";
import { atlasPrototypeEnabled } from "@/features/atlas/prototype";
import { isAtlasNodeId } from "@/features/atlas/view";
import { requireOnboardedUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Career map" };

/**
 * Career Atlas prototype. Reads only the student's catalog major, major source
 * and Direction role marks (dismissed / Interested). Custom major text is never passed in.
 * Interested / Not interested marks stay in the browser and are not saved.
 */
export default async function CareerAtlasPage({
  searchParams,
}: {
  searchParams: Promise<{ at?: string | string[] }>;
}) {
  const user = await requireOnboardedUser();
  if (!atlasPrototypeEnabled()) {
    return (
      <PageShell title="Career map">
        <Card>
          <p className="text-neutral-800">The career map is not available yet.</p>
          <div className="mt-4">
            <Button href={ROUTES.direction} variant="secondary" className="w-full sm:w-auto">
              Back to Direction
            </Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  const params = await searchParams;
  const at = typeof params.at === "string" ? params.at : null;
  const graph = atlasGraph();
  const initialFocus = at && isAtlasNodeId(at) && graph.nodes.has(at) ? at : null;
  const entry = atlasEntry(graph, { major: user.major, majorSource: user.majorSource });

  return (
    <PageShell title="Career map" description="Browse careers from your major outward, or anywhere you like.">
      <AtlasExplorer
        entry={entry}
        dismissedRoles={[...user.dismissedCareerRoles]}
        interestedRoles={[...user.interestedCareerRoles]}
        initialFocus={initialFocus}
      />
    </PageShell>
  );
}
