/**
 * Classify Postgres / driver errors for Action persistence without logging free text.
 */

function walkCauses(error: unknown): unknown[] {
  const seen = new Set<unknown>();
  const out: unknown[] = [];
  let current: unknown = error;
  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);
    out.push(current);
    current = "cause" in current ? current.cause : undefined;
  }
  if (typeof current === "string" || typeof current === "number") out.push(current);
  return out;
}

function errorText(error: unknown): string {
  return walkCauses(error)
    .map((part) => {
      if (part instanceof Error) return `${part.message}\n${part.name}`;
      if (typeof part === "object" && part !== null && "message" in part) {
        return String((part as { message: unknown }).message);
      }
      return String(part);
    })
    .join("\n");
}

export { isUniqueViolation } from "@/lib/db-errors";

/** True when Action tables are missing (migration 0009 not applied). */
export function isMissingActionRelation(error: unknown): boolean {
  const message = errorText(error);
  if (!/action_(plans|tasks|skill_progress)/i.test(message)) return false;
  return /does not exist|undefined_table|42P01/i.test(message);
}
