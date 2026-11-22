/**
 * Career Atlas types. Stage B1: static data and pure functions only.
 * See docs/career-atlas.md for the architecture and what is still to come.
 *
 * Levels: domain → family → specialization are Swervly editorial groupings.
 * Occupations are O*NET-SOC records; only their code and title are stored here.
 */

export type DomainId = `dom:${string}`;
export type FamilyId = `fam:${string}`;
export type SpecializationId = `spec:${string}`;
export type OccupationId = `occ:onet:${string}`;
export type AtlasNodeId = DomainId | FamilyId | SpecializationId | OccupationId;

export type AtlasLevel = "domain" | "family" | "specialization" | "occupation";

/** Where a node's words come from. The UI must show this label. */
export type Provenance = "swervly_editorial" | "onet";

/**
 * Editorial work-activity tags. They describe specializations, not people,
 * and are what the preference questions (Stage C) will ask about.
 */
export const ACTIVITY_TAGS = ["build", "model", "test", "code", "data", "people", "organize", "field"] as const;
export type ActivityTag = (typeof ACTIVITY_TAGS)[number];

export type CareerDomain = {
  id: DomainId;
  title: string;
  provenance: "swervly_editorial";
};

export type CareerFamily = {
  id: FamilyId;
  title: string;
  /** One editorial line. Not a sourced fact about any job. */
  summary: string;
  domains: readonly DomainId[];
  provenance: "swervly_editorial";
};

export type OccupationLink = {
  id: OccupationId;
  /** Primary = the closest official occupation for this specialization. */
  primary: boolean;
};

export type Specialization = {
  id: SpecializationId;
  title: string;
  summary: string;
  families: readonly FamilyId[];
  occupations: readonly OccupationLink[];
  activities: readonly ActivityTag[];
  /** Set when no official occupation matches well; the UI says "closest official category". */
  closestOnly?: true;
  provenance: "swervly_editorial";
};

export type Occupation = {
  id: OccupationId;
  /** O*NET-SOC 2019 code, e.g. 17-2141.00. */
  onetCode: string;
  /** Title exactly as O*NET OnLine prints it. */
  title: string;
  provenance: "onet";
};

export type MajorFamilyStrength = "common" | "sometimes";

export type MajorFamilyLink = {
  family: FamilyId;
  strength: MajorFamilyStrength;
};

export type AtlasData = {
  domains: readonly CareerDomain[];
  families: readonly CareerFamily[];
  specializations: readonly Specialization[];
  occupations: readonly Occupation[];
  /** Catalog major name → families it commonly opens. Never a restriction. */
  majorLinks: Readonly<Record<string, readonly MajorFamilyLink[]>>;
};

export type AtlasNode = {
  id: AtlasNodeId;
  level: AtlasLevel;
  title: string;
  provenance: Provenance;
};

export function levelOf(id: string): AtlasLevel | null {
  if (id.startsWith("dom:")) return "domain";
  if (id.startsWith("fam:")) return "family";
  if (id.startsWith("spec:")) return "specialization";
  if (id.startsWith("occ:onet:")) return "occupation";
  return null;
}

