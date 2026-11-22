/**
 * Prompts for the optional review note ("Anything a student considering this
 * co-op should know?"). The placeholder rotates through the questions; each
 * chip inserts a sentence starter. Nothing here makes the note required.
 */

export const FREE_TEXT_MAX = 2000;

/** Rotating placeholder questions, shown only while the note is empty. */
export const REVIEW_PROMPT_QUESTIONS = [
  "What surprised you in your first week?",
  "What do you wish you had known before starting?",
  "What kind of person thrives on this team?",
  "What did a normal day look like?",
  "How did you get help when you were stuck?",
] as const;

/** Tappable chips. `label` stays short so four fit on a phone; `starter` is inserted. */
export const REVIEW_PROMPT_CHIPS = [
  { label: "My first week", starter: "What surprised me in my first week was " },
  { label: "Wish I'd known", starter: "I wish I had known before starting that " },
  { label: "Who thrives here", starter: "The kind of person who thrives on this team is " },
  { label: "A normal day", starter: "A normal day looked like " },
] as const;

export const PROMPT_ROTATE_MS = 4000;

export function placeholderAt(index: number): string {
  const size = REVIEW_PROMPT_QUESTIONS.length;
  return REVIEW_PROMPT_QUESTIONS[((index % size) + size) % size];
}

/**
 * The note with a sentence starter added. An empty note becomes the starter;
 * otherwise the starter begins a new paragraph. If it would pass the length
 * limit, the note is returned unchanged.
 */
export function insertStarter(current: string, starter: string, max: number = FREE_TEXT_MAX): string {
  const kept = current.replace(/\s+$/, "");
  const next = kept.length === 0 ? starter : `${kept}\n\n${starter}`;
  return next.length > max ? current : next;
}
