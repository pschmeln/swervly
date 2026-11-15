/**
 * Canonical employer-name key for matching and unique indexing.
 * Pure: lowercase, trim, & → and, strip punctuation, collapse spaces,
 * then drop at most one trailing corporate suffix.
 */
const CORPORATE_SUFFIXES = [
  "corporation",
  "company",
  "corp",
  "llc",
  "inc",
  "ltd",
  "co",
] as const;

export function normalizeEmployerName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  for (const suffix of CORPORATE_SUFFIXES) {
    const pattern = new RegExp(`(?:^|\\s)${suffix}$`);
    if (pattern.test(normalized)) {
      normalized = normalized.replace(new RegExp(`(?:^|\\s)${suffix}$`), "").trim();
      break;
    }
  }

  return normalized;
}
