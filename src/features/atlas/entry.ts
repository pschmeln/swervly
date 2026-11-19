import { academicSource, selectionFromStored, type StoredMajor } from "@/features/majors/selection";
import { domainsAlphabetical, type AtlasGraph } from "@/features/atlas/graph";
import type { DomainId, FamilyId, MajorFamilyLink } from "@/features/atlas/types";

/**
 * Where a student's Atlas starts. A starting point, never a match.
 *
 * - Catalog major with a row in MAJOR_LINKS → its families, common first,
 *   plus one family from a domain the major does not touch.
 * - Custom, undecided, unset, or an unmapped catalog major → every domain,
 *   alphabetical, with no ranking. Custom major text is never read here.
 */
export type AtlasEntry =
  | {
      kind: "major";
      /** Catalog name only. Safe to show; never custom text. */
      label: string;
      families: readonly MajorFamilyLink[];
      furtherAfield: FamilyId | null;
    }
  | {
      kind: "open";
      reason: "custom" | "undecided" | "unset" | "unmapped";
      domains: readonly DomainId[];
    };

/** Only the fields entry needs. `customMajorText` is deliberately absent. */
export type EntryMajorInput = Pick<StoredMajor, "major" | "majorSource">;

export function atlasEntry(graph: AtlasGraph, stored: EntryMajorInput): AtlasEntry {
  // customMajorText is passed as null so no private text can flow into Atlas.
  const safe: StoredMajor = { major: stored.major, majorSource: stored.majorSource, customMajorText: null };
  const open = (reason: "custom" | "undecided" | "unset" | "unmapped"): AtlasEntry => ({
    kind: "open",
    reason,
    domains: domainsAlphabetical(graph),
  });

  const source = academicSource(safe);
  if (source === "unset") return open("unset");
  // Covers majorSource "custom" and legacy rows whose text does not match the catalog.
  const selection = selectionFromStored(safe);
  if (selection.source === "custom") return open("custom");
  if (selection.source === "undecided") return open("undecided");
  if (!selection.name) return open("unset");

  // The canonical catalog name, never the stored spelling.
  const label = selection.name;
  const links = graph.data.majorLinks[label];
  if (!links || links.length === 0) return open("unmapped");

  const families = [...links].sort((left, right) => {
    if (left.strength !== right.strength) return left.strength === "common" ? -1 : 1;
    return 0;
  });
  return { kind: "major", label, families, furtherAfield: furtherAfield(graph, families) };
}

/** First family, by ID, whose domains share nothing with the entry families' domains. */
function furtherAfield(graph: AtlasGraph, links: readonly MajorFamilyLink[]): FamilyId | null {
  const entryIds = new Set(links.map((link) => link.family));
  const entryDomains = new Set(
    graph.data.families.filter((item) => entryIds.has(item.id)).flatMap((item) => item.domains),
  );
  const candidate = [...graph.data.families]
    .sort((left, right) => left.id.localeCompare(right.id))
    .find((item) => !entryIds.has(item.id) && item.domains.every((domainId) => !entryDomains.has(domainId)));
  return candidate?.id ?? null;
}
