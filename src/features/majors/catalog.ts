/**
 * Approved starter catalog. Founder-approved additions live in major_catalog
 * and are passed in as extras. "Undecided / Not sure" is not a row here.
 */

import { showsMajorCategory } from "@/lib/audience";

export const UNDECIDED_LABEL = "Undecided / Not sure";
export const CUSTOM_MAJOR_PROMPT = "My major isn't listed";
export const APPROVED_CUSTOM_CATEGORY = "Student-submitted";

export const MAJOR_CATEGORIES = [
  "Engineering & Technology",
  "Computer Science & Information Technology",
  "Business & Management",
  "Economics & Finance",
  "Natural Sciences",
  "Healthcare & Life Sciences",
  "Social Sciences",
  "Arts & Humanities",
  "Education",
  "Communication & Media",
  "Mathematics & Statistics",
  "Interdisciplinary Studies",
] as const;

export type MajorCategory = (typeof MAJOR_CATEGORIES)[number];

export type MajorFamily =
  | "engineering"
  | "computing"
  | "business"
  | "economics"
  | "healthcare"
  | "natural_science"
  | "social_science"
  | "arts_humanities"
  | "education"
  | "communication"
  | "math"
  | "interdisciplinary"
  | "unknown";

export type CatalogMajor = {
  name: string;
  category: string;
  aliases: readonly string[];
  /** Kept so existing "Other" rows still resolve. Hidden from search. */
  legacy?: boolean;
};

const CATEGORY_FAMILY: Record<MajorCategory, MajorFamily> = {
  "Engineering & Technology": "engineering",
  "Computer Science & Information Technology": "computing",
  "Business & Management": "business",
  "Economics & Finance": "economics",
  "Natural Sciences": "natural_science",
  "Healthcare & Life Sciences": "healthcare",
  "Social Sciences": "social_science",
  "Arts & Humanities": "arts_humanities",
  Education: "education",
  "Communication & Media": "communication",
  "Mathematics & Statistics": "math",
  "Interdisciplinary Studies": "interdisciplinary",
};

function entry(category: MajorCategory, name: string, aliases: readonly string[] = []): CatalogMajor {
  return { name, category, aliases };
}

export const CATALOG: readonly CatalogMajor[] = [
  entry("Engineering & Technology", "Aerospace Engineering", ["aero"]),
  entry("Engineering & Technology", "Architectural Engineering"),
  entry("Engineering & Technology", "Biomedical Engineering", ["bme"]),
  entry("Engineering & Technology", "Chemical Engineering", ["chem e"]),
  entry("Engineering & Technology", "Civil Engineering"),
  entry("Engineering & Technology", "Construction Management"),
  entry("Engineering & Technology", "Electrical Engineering", ["ee"]),
  entry("Engineering & Technology", "Environmental Engineering"),
  entry("Engineering & Technology", "Industrial & Systems Engineering", ["ise"]),
  entry("Engineering & Technology", "Mechanical Engineering", ["me", "mech e"]),
  entry("Engineering & Technology", "Engineering Technology"),
  entry("Engineering & Technology", "Materials Engineering"),

  entry("Computer Science & Information Technology", "Computer Science", ["cs", "comp sci", "computer sci"]),
  entry("Computer Science & Information Technology", "Computer Engineering", ["compe", "comp e"]),
  entry("Computer Science & Information Technology", "Cybersecurity Engineering"),
  entry("Computer Science & Information Technology", "Software Engineering"),
  entry("Computer Science & Information Technology", "Information Technology", ["it"]),
  entry("Computer Science & Information Technology", "Information Systems"),
  entry("Computer Science & Information Technology", "Data Science"),
  entry("Computer Science & Information Technology", "Cybersecurity"),

  entry("Business & Management", "Accounting"),
  entry("Business & Management", "Business Administration", ["business", "bba"]),
  entry("Business & Management", "Marketing"),
  entry("Business & Management", "Management"),
  entry("Business & Management", "Supply Chain Management"),
  entry("Business & Management", "International Business"),
  entry("Business & Management", "Human Resource Management", ["hr", "human resources"]),
  entry("Business & Management", "Entrepreneurship"),

  entry("Economics & Finance", "Economics", ["econ"]),
  entry("Economics & Finance", "Finance"),
  entry("Economics & Finance", "Actuarial Science"),

  entry("Natural Sciences", "Biology"),
  entry("Natural Sciences", "Chemistry"),
  entry("Natural Sciences", "Physics"),
  entry("Natural Sciences", "Biochemistry"),
  entry("Natural Sciences", "Environmental Science"),
  entry("Natural Sciences", "Neuroscience"),
  entry("Natural Sciences", "Geology"),

  entry("Healthcare & Life Sciences", "Nursing", ["bsn"]),
  entry("Healthcare & Life Sciences", "Public Health"),
  entry("Healthcare & Life Sciences", "Health Administration"),
  entry("Healthcare & Life Sciences", "Pre-Medicine", ["pre med", "premed"]),
  entry("Healthcare & Life Sciences", "Pharmacy"),
  entry("Healthcare & Life Sciences", "Kinesiology"),
  entry("Healthcare & Life Sciences", "Nutrition"),

  entry("Social Sciences", "Psychology", ["psych"]),
  entry("Social Sciences", "Sociology"),
  entry("Social Sciences", "Political Science", ["poli sci", "political sci"]),
  entry("Social Sciences", "Anthropology"),
  entry("Social Sciences", "Criminal Justice"),
  entry("Social Sciences", "Social Work"),
  entry("Social Sciences", "International Relations"),

  entry("Arts & Humanities", "English"),
  entry("Arts & Humanities", "History"),
  entry("Arts & Humanities", "Philosophy"),
  entry("Arts & Humanities", "Art"),
  entry("Arts & Humanities", "Music"),
  entry("Arts & Humanities", "World Languages"),
  entry("Arts & Humanities", "Graphic Design"),

  entry("Education", "Elementary Education"),
  entry("Education", "Secondary Education"),
  entry("Education", "Special Education"),
  entry("Education", "Early Childhood Education"),

  entry("Communication & Media", "Communication"),
  entry("Communication & Media", "Journalism"),
  entry("Communication & Media", "Public Relations"),
  entry("Communication & Media", "Media Studies"),
  entry("Communication & Media", "Digital Media"),

  entry("Mathematics & Statistics", "Mathematics", ["math"]),
  entry("Mathematics & Statistics", "Statistics"),
  entry("Mathematics & Statistics", "Applied Mathematics"),

  entry("Interdisciplinary Studies", "Interdisciplinary Studies"),
  entry("Interdisciplinary Studies", "Environmental Studies"),
  entry("Interdisciplinary Studies", "Cognitive Science"),
  entry("Interdisciplinary Studies", "Liberal Studies"),

  { name: "Other", category: "Legacy", aliases: [], legacy: true },
];

export type MajorAlias = {
  normalizedName: string;
  canonicalName: string;
};

export type MajorSearchContext = {
  extraMajors?: readonly CatalogMajor[];
  aliases?: readonly MajorAlias[];
};

export function normalizeMajorName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanMajorName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Two-letter aliases that also name other fields. Search can show them; saving must not promote them. */
export const AMBIGUOUS_SHORT_ALIASES = new Set(["cs", "me", "ee", "it", "hr"]);

export function isAmbiguousShortAlias(value: string): boolean {
  return AMBIGUOUS_SHORT_ALIASES.has(normalizeMajorName(value));
}

const CODE_BY_KEY = new Map<string, CatalogMajor>();
for (const major of CATALOG) {
  const nameKey = normalizeMajorName(major.name);
  if (!CODE_BY_KEY.has(nameKey)) CODE_BY_KEY.set(nameKey, major);
  for (const alias of major.aliases) {
    const aliasKey = normalizeMajorName(alias);
    if (!aliasKey || isAmbiguousShortAlias(aliasKey) || CODE_BY_KEY.has(aliasKey)) continue;
    CODE_BY_KEY.set(aliasKey, major);
  }
}

function pool(context: MajorSearchContext | undefined): readonly CatalogMajor[] {
  return [...CATALOG, ...(context?.extraMajors ?? [])];
}

export function matchCatalog(name: string, context: MajorSearchContext = {}): CatalogMajor | null {
  const key = normalizeMajorName(name);
  if (!key) return null;

  const code = CODE_BY_KEY.get(key);
  if (code) return code;

  const alias = (context.aliases ?? []).find(
    (item) => item.normalizedName === key && !isAmbiguousShortAlias(item.normalizedName),
  );
  if (alias) {
    const fromCode = CODE_BY_KEY.get(normalizeMajorName(alias.canonicalName));
    if (fromCode) return fromCode;
    const fromExtra = (context.extraMajors ?? []).find(
      (major) => normalizeMajorName(major.name) === normalizeMajorName(alias.canonicalName),
    );
    if (fromExtra) return fromExtra;
  }

  for (const major of context.extraMajors ?? []) {
    if (normalizeMajorName(major.name) === key) return major;
    if (major.aliases.some((item) => normalizeMajorName(item) === key && !isAmbiguousShortAlias(item))) {
      return major;
    }
  }
  return null;
}

export function majorFamily(name: string, context: MajorSearchContext = {}): MajorFamily {
  const match = matchCatalog(name, context);
  if (!match || match.legacy) return "unknown";
  if ((MAJOR_CATEGORIES as readonly string[]).includes(match.category)) {
    return CATEGORY_FAMILY[match.category as MajorCategory];
  }
  return "unknown";
}

/** Engineering majors keep the legacy co-op rules. Computing majors do not, unless a named rule set includes them. */
export function usesEngineeringDirection(name: string, context: MajorSearchContext = {}): boolean {
  return majorFamily(name, context) === "engineering";
}

function scoreMajor(major: CatalogMajor, query: string): number {
  const nameKey = normalizeMajorName(major.name);
  if (nameKey === query) return 100;
  if (major.aliases.some((alias) => normalizeMajorName(alias) === query)) return 95;
  if (nameKey.startsWith(query)) return 80;
  if (major.aliases.some((alias) => normalizeMajorName(alias).startsWith(query))) return 70;
  if (nameKey.includes(query)) return 50;
  if (major.aliases.some((alias) => normalizeMajorName(alias).includes(query))) return 40;
  const categoryKey = normalizeMajorName(major.category);
  if (categoryKey.includes(query)) return 20;
  return 0;
}

export function searchMajors(query: string, context: MajorSearchContext = {}): CatalogMajor[] {
  // Majors outside the current audience (src/lib/audience.ts) stay matchable but are not offered.
  const visible = pool(context).filter((major) => !major.legacy && showsMajorCategory(major.category));
  const seen = new Set<string>();
  const unique: CatalogMajor[] = [];
  for (const major of visible) {
    const key = normalizeMajorName(major.name);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(major);
  }

  const normalized = normalizeMajorName(query);
  if (!normalized) {
    return [...unique].sort((left, right) => left.name.localeCompare(right.name));
  }

  return unique
    .map((major) => ({ major, score: scoreMajor(major, normalized) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.major.name.localeCompare(right.major.name);
    })
    .map((item) => item.major);
}

export function listPublicMajorNames(context: MajorSearchContext = {}): string[] {
  return searchMajors("", context).map((major) => major.name);
}
