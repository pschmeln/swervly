/** Pulls email addresses out of pasted text or a CSV file, lowercased and deduplicated. Runs in the browser. */
export function extractEmails(text: string): string[] {
  const found = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g) ?? [];
  return [...new Set(found.map((email) => email.toLowerCase()))];
}

/** Most addresses one roster request may carry; bigger lists go in several uploads. */
export const ROSTER_BATCH_MAX = 2000;
/** Most addresses one school's roster may hold. */
export const ROSTER_MAX = 20000;
