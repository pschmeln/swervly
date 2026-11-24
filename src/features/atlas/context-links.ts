import { rolesForFamily } from "@/features/atlas/compat";
import type { AtlasGraph } from "@/features/atlas/graph";
import type { AtlasNodeId } from "@/features/atlas/types";
import { familiesAbove } from "@/features/atlas/view";
import { COMMUNITY_ROLE_IDS } from "@/features/community/rules";
import { careerRoleLabel } from "@/features/direction/career-roles";
import { showsRole } from "@/lib/audience";
import { ROUTES } from "@/lib/constants";

/**
 * Contextual links from a career to Community and Reviews (V1-01 "Contextual", Nov 24, 2026).
 * Reviews and Community are off the top nav; students reach them from the careers they relate to.
 */

/** At most this many discussion links per career, so the card stays short. */
export const MAX_DISCUSSION_LINKS = 2;

export const REFLECT_LINE = "Done a co-op or internship in this area? Reflecting on it sharpens your suggestions.";

export type DiscussionLink = { role: string; label: string; href: string };

/**
 * Community posts tagged with one role, across every direction. `all=1` matters: without it,
 * Community narrows posts to the student's own chosen direction, which could hide them all.
 */
export function communityRoleHref(role: string): string {
  return `${ROUTES.community}?${new URLSearchParams({ role, all: "1" }).toString()}`;
}

/** Discussion links for a role, or none when Community doesn't tag posts with it or it is hidden. */
export function discussionLinksForRole(role: string): DiscussionLink[] {
  if (!COMMUNITY_ROLE_IDS.includes(role) || !showsRole(role)) return [];
  return [{ role, label: careerRoleLabel(role), href: communityRoleHref(role) }];
}

/** Discussion links for a career map node: the Community roles of the families it sits under. */
export function discussionLinksForNode(graph: AtlasGraph, id: AtlasNodeId): DiscussionLink[] {
  const roles = new Set<string>();
  for (const family of familiesAbove(graph, id)) for (const role of rolesForFamily(family)) roles.add(role);
  return [...roles].flatMap(discussionLinksForRole).slice(0, MAX_DISCUSSION_LINKS);
}
