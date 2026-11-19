import { familiesForRole } from "@/features/atlas/compat";
import type { AtlasEntry } from "@/features/atlas/entry";
import { childrenOf, familiesBlockedByRoles, pathsTo, visibilityOf, type AtlasGraph } from "@/features/atlas/graph";
import { ROLE_FAMILIES } from "@/features/atlas/compat";
import { levelOf, type AtlasLevel, type AtlasNodeId, type FamilyId } from "@/features/atlas/types";

/** Shown on every Atlas screen. */
export const ATLAS_BANNER = "Prototype. A map of careers to explore, not a prediction of fit.";
export const EDITORIAL_LABEL = "Swervly grouping";
export const SOURCED_LABEL = "Official occupation · O*NET";
export const CLOSEST_LABEL = "No official occupation matches well. These are the closest official categories.";
export const MARK_NOTE = "Marked on this screen. Not saved.";
export const OCCUPATION_PENDING =
  "Swervly hasn't added the O*NET description, tasks and skills for this occupation yet.";

export type Marks = {
  interested: readonly AtlasNodeId[];
  dismissed: readonly AtlasNodeId[];
};

export type CardModel = {
  id: AtlasNodeId;
  level: AtlasLevel;
  title: string;
  summary: string | null;
  badge: string;
  why: string | null;
  interested: boolean;
};

export type RootModel = {
  heading: string;
  note: string;
  groups: { title: string; cards: CardModel[] }[];
};

export type NodeModel = {
  id: AtlasNodeId;
  level: AtlasLevel;
  title: string;
  summary: string | null;
  badge: string;
  onetCode: string | null;
  closestOnly: boolean;
  children: CardModel[];
  hiddenChildren: CardModel[];
  /** Other places this node sits, each as the path to open it. */
  alsoUnder: { label: string; path: AtlasNodeId[] }[];
  why: string[];
  unknowns: string[];
  childrenHeading: string | null;
};

function summaryOf(graph: AtlasGraph, id: AtlasNodeId): string | null {
  const family = graph.data.families.find((item) => item.id === id);
  if (family) return family.summary;
  const spec = graph.data.specializations.find((item) => item.id === id);
  return spec ? spec.summary : null;
}

function badgeOf(level: AtlasLevel): string {
  return level === "occupation" ? SOURCED_LABEL : EDITORIAL_LABEL;
}

function entryWhy(entry: AtlasEntry, id: AtlasNodeId): string | null {
  if (entry.kind !== "major") return null;
  const link = entry.families.find((item) => item.family === id);
  if (link?.strength === "common") return `${entry.label} students often explore this.`;
  if (link?.strength === "sometimes") return `Some ${entry.label} students explore this.`;
  if (entry.furtherAfield === id) return `Outside the usual ${entry.label} paths, in case you want to look further.`;
  return null;
}

export function card(graph: AtlasGraph, entry: AtlasEntry, id: AtlasNodeId, marks: Marks): CardModel | null {
  const node = graph.nodes.get(id);
  if (!node) return null;
  return {
    id,
    level: node.level,
    title: node.title,
    summary: summaryOf(graph, id),
    badge: badgeOf(node.level),
    why: entryWhy(entry, id),
    interested: marks.interested.includes(id),
  };
}

export function blockedFamilies(dismissedRoles: readonly string[]): Set<FamilyId> {
  return familiesBlockedByRoles(ROLE_FAMILIES, dismissedRoles);
}

/** The first screen. Never ranked by anything the student did not say. */
export function rootModel(
  graph: AtlasGraph,
  entry: AtlasEntry,
  marks: Marks,
  dismissedRoles: readonly string[] = [],
): RootModel {
  const blocked = blockedFamilies(dismissedRoles);
  const make = (ids: readonly AtlasNodeId[]) =>
    ids.flatMap((id) => {
      if (marks.dismissed.includes(id)) return [];
      // Families tied only to a dismissed Direction role leave the first screen; they stay browsable.
      if (blocked.has(id as FamilyId) && !marks.interested.includes(id)) return [];
      const model = card(graph, entry, id, marks);
      return model ? [model] : [];
    });
  const allDomains = [...graph.data.domains]
    .sort((left, right) => left.title.localeCompare(right.title))
    .map((item) => item.id);

  if (entry.kind === "major") {
    const common = entry.families.filter((link) => link.strength === "common").map((link) => link.family);
    const sometimes = entry.families.filter((link) => link.strength === "sometimes").map((link) => link.family);
    const groups = [
      { title: `Where ${entry.label} often leads`, cards: make(common) },
      { title: "Also worth a look", cards: make(sometimes) },
      { title: "Further afield", cards: make(entry.furtherAfield ? [entry.furtherAfield] : []) },
      { title: "Browse every area", cards: make(allDomains) },
    ].filter((group) => group.cards.length > 0);
    return {
      heading: `Starting from ${entry.label}`,
      note: "Your major is a starting point, not a verdict. Every area stays open to browse.",
      groups,
    };
  }

  const note =
    entry.reason === "custom"
      ? "Atlas doesn't read custom majors, so every area is open. Nothing here is ranked."
      : entry.reason === "unmapped"
        ? "Swervly hasn't mapped your major to career areas yet, so every area is open. Nothing here is ranked."
        : "Start anywhere. Areas are listed alphabetically and nothing here is ranked.";
  return { heading: "Explore every area", note, groups: [{ title: "Career areas", cards: make(allDomains) }] };
}

const CHILD_HEADINGS: Record<AtlasLevel, string | null> = {
  domain: "Career families",
  family: "Specializations",
  specialization: "Occupations",
  occupation: null,
};

/** One drill-down screen. `trail` is the path the student took to get here, top first. */
export function nodeModel(
  graph: AtlasGraph,
  entry: AtlasEntry,
  id: AtlasNodeId,
  trail: readonly AtlasNodeId[],
  marks: Marks,
  dismissedRoles: readonly string[],
): NodeModel | null {
  const node = graph.nodes.get(id);
  if (!node) return null;
  const blocked = blockedFamilies(dismissedRoles);
  const visibility = (child: AtlasNodeId) =>
    visibilityOf(graph, child, { dismissedNodes: marks.dismissed, interestedNodes: marks.interested, blockedFamilies: blocked });

  const children: CardModel[] = [];
  const hiddenChildren: CardModel[] = [];
  for (const child of childrenOf(graph, id)) {
    const model = card(graph, entry, child.id, marks);
    if (!model) continue;
    if (visibility(child.id) === "visible") children.push(model);
    else hiddenChildren.push(model);
  }

  const parentInTrail = trail.at(-2);
  const alsoUnder = pathsTo(graph, id)
    .filter((path) => path.at(-2) !== parentInTrail)
    .map((path) => ({ label: path.slice(1, -1).map((step) => graph.nodes.get(step)?.title ?? "").join(" › ") || (graph.nodes.get(path[0])?.title ?? ""), path }))
    .filter((item, index, list) => list.findIndex((other) => other.label === item.label) === index);

  const why: string[] = [];
  const entryReason = trail.map((step) => entryWhy(entry, step)).find((reason) => reason !== null);
  if (entryReason) why.push(entryReason);
  else why.push(entry.kind === "major" ? "You opened this yourself while browsing." : "You're browsing every area.");
  if (marks.interested.includes(id)) why.push("You marked this Interested.");
  const roleLinks = dismissedRoles.filter((role) => trail.some((step) => familiesForRole(role).includes(step as FamilyId)));
  if (roleLinks.length > 0) why.push("You dismissed a related Direction suggestion. This stays open because you came here yourself.");

  const spec = graph.data.specializations.find((item) => item.id === id);
  const occupation = graph.data.occupations.find((item) => item.id === id);
  const unknowns = [
    "Which kinds of work you prefer, like building, modeling or working with people. Short questions are coming.",
    "Whether you've tried this work in a co-op, class or project.",
  ];
  if (node.level === "occupation") unknowns.unshift(OCCUPATION_PENDING);

  return {
    id,
    level: node.level,
    title: node.title,
    summary: summaryOf(graph, id),
    badge: badgeOf(node.level),
    onetCode: occupation?.onetCode ?? null,
    closestOnly: spec?.closestOnly === true,
    children,
    hiddenChildren,
    alsoUnder,
    why,
    unknowns,
    childrenHeading: CHILD_HEADINGS[node.level],
  };
}

/** Title search across every level. Case-insensitive, at least 2 characters, at most 8 results. */
export function searchAtlas(graph: AtlasGraph, query: string): { id: AtlasNodeId; title: string; level: AtlasLevel }[] {
  const needle = query.trim().toLowerCase();
  if (needle.length < 2) return [];
  const order: AtlasLevel[] = ["domain", "family", "specialization", "occupation"];
  return [...graph.nodes.values()]
    .filter((node) => node.title.toLowerCase().includes(needle))
    .sort((left, right) => order.indexOf(left.level) - order.indexOf(right.level) || left.title.localeCompare(right.title))
    .slice(0, 8)
    .map((node) => ({ id: node.id, title: node.title, level: node.level }));
}

/** First path to a node, used to open a search result or a link from Direction. */
export function defaultTrail(graph: AtlasGraph, id: AtlasNodeId): AtlasNodeId[] {
  return pathsTo(graph, id)[0] ?? [];
}

export function isAtlasNodeId(value: string): value is AtlasNodeId {
  return levelOf(value) !== null;
}

export function onetOnlineHref(onetCode: string): string | null {
  return /^\d{2}-\d{4}\.\d{2}$/.test(onetCode) ? `https://www.onetonline.org/link/summary/${onetCode}` : null;
}
