import { z } from "zod";
import { FAMILIES } from "@/content/atlas/taxonomy";
import { careerRoleLabel, EXTRA_CAREER_ROLE_IDS } from "@/features/direction/career-roles";
import { ROLE_TYPE_VALUES } from "@/features/review/roles";

/**
 * Community rules (item 14, D3). Posts and answers appear at once to other signed-in students
 * without the author's name; anyone can report; founders hide, restore or remove (PR 4.3).
 */
export const COMMUNITY_TERMS_VERSION = 1;

export const COMMUNITY_TERMS = [
  "Other students see your posts and answers without your name. The two Swervly founders can see who wrote them.",
  "Don't post anyone's private information, including your own contact details, and don't post anything about a person by name.",
  "Anyone can report a post. The founders can hide or remove posts that break these rules.",
  "You can edit for 15 minutes after posting and delete at any time.",
] as const;

export const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** Hourly caps per student (design doc: questions 5, answers 20, reports 10, Helpful 60). */
export const RATE_LIMITS = { post: 5, comment: 20, report: 10, helpful: 60 } as const;
export type RateAction = keyof typeof RATE_LIMITS;

export const POST_KINDS = ["question", "advice"] as const;
export const POST_KIND_LABELS: Record<(typeof POST_KINDS)[number] | "archetype", string> = {
  question: "Question",
  advice: "Advice",
  archetype: "Work style",
};

export const REPORT_REASONS = ["spam", "private_info", "unsafe", "off_topic"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  spam: "Spam or advertising",
  private_info: "Shares private information",
  unsafe: "Harassment or unsafe",
  off_topic: "Not about co-ops or careers",
};

const FAMILY_IDS = new Set(FAMILIES.map((family) => family.id));

/** Roles a post can be tagged with: every career role except "other" and "insufficient". */
export const COMMUNITY_ROLE_IDS: readonly string[] = [...ROLE_TYPE_VALUES, ...EXTRA_CAREER_ROLE_IDS].filter(
  (id) => id !== "other" && id !== "insufficient",
);
export const COMMUNITY_ROLE_OPTIONS = COMMUNITY_ROLE_IDS.map((id) => ({ value: id, label: careerRoleLabel(id) })).sort((a, b) =>
  a.label.localeCompare(b.label),
);
export const COMMUNITY_AREA_OPTIONS = FAMILIES.map((family) => ({ value: family.id, label: family.title })).sort((a, b) =>
  a.label.localeCompare(b.label),
);

export const TITLE_MAX = 140;
export const BODY_MAX = 4000;
export const COMMENT_MAX = 2000;

const title = z.string().trim().min(3, { error: "Add a title (3 to 140 characters)." }).max(TITLE_MAX, { error: "Use 140 characters or fewer." });
const body = z.string().trim().max(BODY_MAX, { error: `Use ${BODY_MAX} characters or fewer.` });

export const PostInput = z
  .object({
    kind: z.enum(POST_KINDS, { error: "Choose Question or Advice." }),
    title,
    body,
    employerId: z.uuid().nullable().optional(),
    roleType: z.string().refine((value) => COMMUNITY_ROLE_IDS.includes(value), { error: "Choose a role from the list." }).nullable().optional(),
    atlasFamily: z.string().refine((value) => FAMILY_IDS.has(value as never), { error: "Choose an area from the list." }).nullable().optional(),
  })
  .refine((input) => input.kind === "question" || input.body.length >= 10, {
    error: "Add a few sentences of advice (at least 10 characters).",
    path: ["body"],
  });
export type PostInput = z.infer<typeof PostInput>;

export const PostEditInput = z.object({ title, body });
export const CommentInput = z.object({
  body: z.string().trim().min(1, { error: "Write an answer first." }).max(COMMENT_MAX, { error: `Use ${COMMENT_MAX} characters or fewer.` }),
});
export const HelpfulInput = z.object({ target: z.enum(["post", "comment"]), id: z.uuid(), on: z.boolean() });
export const ReportInput = z.object({ target: z.enum(["post", "comment"]), id: z.uuid(), reason: z.enum(REPORT_REASONS, { error: "Choose a reason." }) });
export const TermsInput = z.object({ version: z.literal(COMMUNITY_TERMS_VERSION, { error: "The Community rules changed. Reload the page." }) });

export function withinEditWindow(createdAt: Date, now: Date = new Date()): boolean {
  return now.getTime() - createdAt.getTime() < EDIT_WINDOW_MS;
}

export function hasCommunityTerms(user: { communityTermsVersion: number | null }): boolean {
  return user.communityTermsVersion === COMMUNITY_TERMS_VERSION;
}

/** "5 minutes ago", "3 hours ago", "Nov 18". Times are shown, authors never are. */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
