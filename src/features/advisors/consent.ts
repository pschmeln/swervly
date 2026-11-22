/**
 * The advisor opt-in (item 15, PR 6.3, D9). Plain module: Settings, the consent screen, the advisor
 * detail page and the view log all use this list, so what students agree to is exactly what
 * advisors get. Changing the fields or wording means raising ADVISOR_CONSENT_VERSION; grants given
 * under an older version stop working until the student agrees again.
 */
export const ADVISOR_CONSENT_VERSION = 1;

export const ADVISOR_FIELDS = [
  { id: "profile", label: "Profile basics: your email, major, year and goal" },
  { id: "archetype", label: "Your work-style card: its name, description and top 3 traits" },
  { id: "direction", label: "Your chosen direction from the career map" },
  { id: "coops", label: "Your co-op history: companies, roles, terms and whether you'd go back" },
  { id: "ratings", label: "Your review ratings, plus any written notes you already chose to share" },
] as const;

export type AdvisorFieldId = (typeof ADVISOR_FIELDS)[number]["id"];
export const ADVISOR_FIELD_IDS: readonly AdvisorFieldId[] = ADVISOR_FIELDS.map((field) => field.id);

export const NOT_SHARED = [
  "Your pay",
  "Written notes you didn't mark as shared",
  "Your home city, quiz answers, Community posts and anything else not listed above",
] as const;

export const CONSENT_INTRO =
  "Your school's approved co-op and career advisors will be able to open your details. Every time one does, you'll see their name, the date and what they saw below. You can stop sharing at any time, and it takes effect right away.";

export const ROSTER_PROMPT = "An advisor at your school added you to their roster. Do you want to share your details with your school's advisors?";
