import { MAJOR_LINKS } from "@/content/atlas/major-links";
import { OCCUPATIONS } from "@/content/atlas/occupations";
import { DOMAINS, FAMILIES, SPECIALIZATIONS } from "@/content/atlas/taxonomy";
import {
  levelOf,
  type AtlasData,
  type AtlasNode,
  type AtlasNodeId,
  type DomainId,
  type FamilyId,
} from "@/features/atlas/types";

export const ATLAS_DATA: AtlasData = {
  domains: DOMAINS,
  families: FAMILIES,
  specializations: SPECIALIZATIONS,
  occupations: OCCUPATIONS,
  majorLinks: MAJOR_LINKS,
};

export type AtlasGraph = {
  data: AtlasData;
  nodes: ReadonlyMap<AtlasNodeId, AtlasNode>;
  children: ReadonlyMap<AtlasNodeId, readonly AtlasNodeId[]>;
  parents: ReadonlyMap<AtlasNodeId, readonly AtlasNodeId[]>;
};

function push(map: Map<AtlasNodeId, AtlasNodeId[]>, key: AtlasNodeId, value: AtlasNodeId) {
  const list = map.get(key);
  if (list) {
    if (!list.includes(value)) list.push(value);
  } else {
    map.set(key, [value]);
  }
}

/** Index the data. Edges point downward only: domain → family → specialization → occupation. */
export function buildGraph(data: AtlasData): AtlasGraph {
  const nodes = new Map<AtlasNodeId, AtlasNode>();
  const children = new Map<AtlasNodeId, AtlasNodeId[]>();
  const parents = new Map<AtlasNodeId, AtlasNodeId[]>();

  for (const item of data.domains) nodes.set(item.id, { id: item.id, level: "domain", title: item.title, provenance: item.provenance });
  for (const item of data.families) {
    nodes.set(item.id, { id: item.id, level: "family", title: item.title, provenance: item.provenance });
    for (const parent of item.domains) {
      push(children, parent, item.id);
      push(parents, item.id, parent);
    }
  }
  for (const item of data.specializations) {
    nodes.set(item.id, { id: item.id, level: "specialization", title: item.title, provenance: item.provenance });
    for (const parent of item.families) {
      push(children, parent, item.id);
      push(parents, item.id, parent);
    }
    for (const link of item.occupations) {
      push(children, item.id, link.id);
      push(parents, link.id, item.id);
    }
  }
  for (const item of data.occupations) nodes.set(item.id, { id: item.id, level: "occupation", title: item.title, provenance: item.provenance });

  return { data, nodes, children, parents };
}

let cached: AtlasGraph | null = null;

/** The prototype's graph, built once. */
export function atlasGraph(): AtlasGraph {
  cached ??= buildGraph(ATLAS_DATA);
  return cached;
}

export function childrenOf(graph: AtlasGraph, id: AtlasNodeId): AtlasNode[] {
  return (graph.children.get(id) ?? []).flatMap((child) => {
    const node = graph.nodes.get(child);
    return node ? [node] : [];
  });
}

export function parentsOf(graph: AtlasGraph, id: AtlasNodeId): AtlasNode[] {
  return (graph.parents.get(id) ?? []).flatMap((parent) => {
    const node = graph.nodes.get(parent);
    return node ? [node] : [];
  });
}

/**
 * Every downward path from a domain to `target`, each listed top first.
 * Paths are sorted so the output is stable.
 */
export function pathsTo(graph: AtlasGraph, target: AtlasNodeId): AtlasNodeId[][] {
  if (!graph.nodes.has(target)) return [];
  if (levelOf(target) === "domain") return [[target]];
  const result: AtlasNodeId[][] = [];
  for (const parent of graph.parents.get(target) ?? []) {
    for (const path of pathsTo(graph, parent)) result.push([...path, target]);
  }
  return result.sort((left, right) => left.join(">").localeCompare(right.join(">")));
}

/** Families that every Direction role in `dismissedRoles` covers, given a role → families map. */
export function familiesBlockedByRoles(
  roleFamilies: Readonly<Record<string, readonly FamilyId[]>>,
  dismissedRoles: readonly string[],
): Set<FamilyId> {
  const dismissed = new Set(dismissedRoles);
  const rolesPerFamily = new Map<FamilyId, string[]>();
  for (const [role, families] of Object.entries(roleFamilies)) {
    for (const familyId of families) rolesPerFamily.set(familyId, [...(rolesPerFamily.get(familyId) ?? []), role]);
  }
  const blocked = new Set<FamilyId>();
  for (const [familyId, roles] of rolesPerFamily) {
    // A family is blocked only when every role that maps to it was dismissed.
    if (roles.length > 0 && roles.every((role) => dismissed.has(role))) blocked.add(familyId);
  }
  return blocked;
}

export type Visibility = "visible" | "dimmed" | "hidden";

/**
 * hidden: the student dismissed this node itself.
 * dimmed: every path to it passes through a dismissed node or a role-blocked family.
 *         Shown under "Hidden by your choices", one tap to restore.
 * visible: at least one open path reaches it.
 * An explicit Interested on the node always makes it visible.
 */
export function visibilityOf(
  graph: AtlasGraph,
  id: AtlasNodeId,
  marks: {
    dismissedNodes: readonly AtlasNodeId[];
    interestedNodes: readonly AtlasNodeId[];
    blockedFamilies: ReadonlySet<FamilyId>;
  },
): Visibility {
  if (marks.interestedNodes.includes(id)) return "visible";
  if (marks.dismissedNodes.includes(id)) return "hidden";
  if (marks.blockedFamilies.has(id as FamilyId)) return "dimmed";
  const closed = (node: AtlasNodeId) =>
    marks.dismissedNodes.includes(node) || marks.blockedFamilies.has(node as FamilyId);
  const paths = pathsTo(graph, id);
  if (paths.length === 0) return "visible";
  const open = paths.some((path) => path.slice(0, -1).every((node) => !closed(node)));
  return open ? "visible" : "dimmed";
}

export function domainsAlphabetical(graph: AtlasGraph): DomainId[] {
  return [...graph.data.domains].sort((left, right) => left.title.localeCompare(right.title)).map((item) => item.id);
}
