import { PageShell } from "@/components/ui";
import { ActionDashboard } from "@/features/action-ui/dashboard";
import { previewLoad, previewPursuing } from "@/features/action-ui/mock";
import { resolveActionSource, resolvePreview } from "@/features/action-ui/source";
import type { PursuingDisplay } from "@/features/action-ui/types";
import { atlasGraph } from "@/features/atlas/graph";
import { loadAtlasState } from "@/features/atlas/server";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata = { title: "Action" };

export default async function ActionPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string | string[] }>;
}) {
  const user = await requireOnboardedUser();
  const source = resolveActionSource({
    NODE_ENV: process.env.NODE_ENV,
    ACTION_UI_SOURCE: process.env.ACTION_UI_SOURCE,
  });
  const preview = resolvePreview(source, (await searchParams).preview);
  const pursuing = source === "api" ? await pursuingForDisplay(user.id) : previewPursuing(preview);
  const initial = source === "api" ? ({ status: "loading" } as const) : previewLoad(preview);

  return (
    <PageShell title="Action" description="Turn your direction into a few steps you can edit." width="wide">
      <ActionDashboard source={source} initial={initial} pursuing={pursuing} />
    </PageShell>
  );
}

/** Title only. Seeding still sends { mode: "atlas_pursuing" } with no node id. */
async function pursuingForDisplay(userId: string): Promise<PursuingDisplay | null> {
  const state = await loadAtlasState(userId);
  if (!state.pursuing) return null;
  const node = atlasGraph().nodes.get(state.pursuing);
  if (!node || (node.level !== "specialization" && node.level !== "occupation")) return null;
  return { title: node.title, level: node.level };
}
