import { CATALOG } from "@/features/majors/catalog";
import { levelOf, ACTIVITY_TAGS, type AtlasData, type AtlasLevel } from "@/features/atlas/types";

const ONET_CODE = /^\d{2}-\d{4}\.\d{2}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Structural checks on Career Atlas data. Returns one message per problem;
 * an empty list means the data is valid. Tests run this on the real dataset.
 */
export function validateAtlas(data: AtlasData): string[] {
  const errors: string[] = [];
  const seen = new Map<string, AtlasLevel>();

  const register = (id: string, expected: AtlasLevel) => {
    const level = levelOf(id);
    if (level !== expected) errors.push(`${id}: expected a ${expected} id`);
    if (seen.has(id)) errors.push(`${id}: duplicate id`);
    seen.set(id, expected);
    if (expected !== "occupation" && !SLUG.test(id.slice(id.indexOf(":") + 1))) errors.push(`${id}: id is not a lowercase slug`);
  };

  for (const item of data.domains) register(item.id, "domain");
  for (const item of data.families) register(item.id, "family");
  for (const item of data.specializations) register(item.id, "specialization");
  for (const item of data.occupations) {
    register(item.id, "occupation");
    if (!ONET_CODE.test(item.onetCode)) errors.push(`${item.id}: bad O*NET-SOC code ${item.onetCode}`);
    if (item.id !== `occ:onet:${item.onetCode}`) errors.push(`${item.id}: id does not match code ${item.onetCode}`);
    if (item.provenance !== "onet") errors.push(`${item.id}: occupations must be sourced`);
    if (!item.title.trim()) errors.push(`${item.id}: missing title`);
  }

  // Every edge points one level down at an existing node. With only downward edges there can be no cycle.
  const edge = (from: string, to: string, level: AtlasLevel) => {
    if (seen.get(to) !== level) errors.push(`${from} → ${to}: target missing or not a ${level}`);
  };

  const reached = new Set<string>();
  for (const item of data.families) {
    if (item.domains.length === 0) errors.push(`${item.id}: family has no domain`);
    for (const parent of item.domains) edge(item.id, parent, "domain");
    if (item.provenance !== "swervly_editorial") errors.push(`${item.id}: families are editorial`);
    if (!item.summary.trim()) errors.push(`${item.id}: missing summary`);
  }
  for (const item of data.specializations) {
    if (item.families.length === 0) errors.push(`${item.id}: specialization has no family`);
    if (item.occupations.length === 0) errors.push(`${item.id}: specialization maps to no sourced occupation`);
    if (item.occupations.filter((link) => link.primary).length !== 1) errors.push(`${item.id}: needs exactly one primary occupation`);
    if (new Set(item.occupations.map((link) => link.id)).size !== item.occupations.length) errors.push(`${item.id}: duplicate occupation link`);
    for (const parent of item.families) edge(item.id, parent, "family");
    for (const link of item.occupations) {
      edge(item.id, link.id, "occupation");
      reached.add(link.id);
    }
    if (item.activities.length === 0) errors.push(`${item.id}: no activity tags`);
    for (const tag of item.activities) {
      if (!(ACTIVITY_TAGS as readonly string[]).includes(tag)) errors.push(`${item.id}: unknown activity ${tag}`);
    }
    if (item.provenance !== "swervly_editorial") errors.push(`${item.id}: specializations are editorial`);
  }

  const familiesWithChildren = new Set(data.specializations.flatMap((item) => item.families));
  for (const item of data.families) {
    if (!familiesWithChildren.has(item.id)) errors.push(`${item.id}: family has no specialization`);
  }
  const domainsWithChildren = new Set(data.families.flatMap((item) => item.domains));
  for (const item of data.domains) {
    if (!domainsWithChildren.has(item.id)) errors.push(`${item.id}: domain has no family`);
  }
  for (const item of data.occupations) {
    if (!reached.has(item.id)) errors.push(`${item.id}: occupation is not reachable from any specialization`);
  }

  const catalogNames = new Set(CATALOG.filter((major) => !major.legacy).map((major) => major.name));
  for (const [major, links] of Object.entries(data.majorLinks)) {
    if (!catalogNames.has(major)) errors.push(`major link "${major}": not a catalog major`);
    for (const link of links) {
      if (seen.get(link.family) !== "family") errors.push(`major link "${major}" → ${link.family}: not a family`);
    }
    if (new Set(links.map((link) => link.family)).size !== links.length) errors.push(`major link "${major}": duplicate family`);
  }

  return errors;
}
