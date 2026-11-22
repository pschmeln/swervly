import { z } from "zod";
import { ROSTER_BATCH_MAX } from "./emails";

/** Same rule as the school_domains_format check in migration 0013: lowercase labels joined by dots. */
const DOMAIN_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

export const Domain = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.replace(/^@/, ""))
  .pipe(z.string().max(253).regex(DOMAIN_PATTERN, { error: "Use an email domain like uc.edu." }));

const Domains = z
  .array(Domain)
  .min(1, { error: "Add at least one email domain." })
  .max(10, { error: "Use 10 domains or fewer." })
  .transform((list) => [...new Set(list)]);

const SchoolName = z.string().trim().min(2, { error: "Add the school's name." }).max(120, { error: "Use 120 characters or fewer." });

/** Founder actions on /founders, one discriminated body for POST /api/founders/advisors. */
export const FounderAdvisorInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_school"), name: SchoolName, domains: Domains }),
  z.object({ action: z.literal("set_domains"), schoolId: z.uuid(), domains: Domains }),
  z.object({ action: z.literal("decide_advisor"), userId: z.uuid(), decision: z.enum(["approve", "revoke"]) }),
]);
export type FounderAdvisorInput = z.infer<typeof FounderAdvisorInput>;

/** An advisor asking for access. The school comes from their sign-in email, never from the body. */
export const AdvisorRequestInput = z.object({
  displayName: z.string().trim().min(2, { error: "Add your name (2 to 80 characters)." }).max(80, { error: "Use 80 characters or fewer." }),
  agreePrivacy: z.literal(true, { error: "Agree to the Privacy Policy to continue." }),
});
export type AdvisorRequestInput = z.infer<typeof AdvisorRequestInput>;

/** Splits a founder's typed list ("uc.edu, mail.uc.edu") into domains. */
export function splitDomains(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

const RosterEmails = z
  .array(z.email({ error: "One of those isn't an email address." }))
  .min(1, { error: "Add at least one email." })
  .max(ROSTER_BATCH_MAX, { error: `Send ${ROSTER_BATCH_MAX} emails or fewer at a time.` });

/** Advisor roster changes (PR 6.2). Emails are hashed on the server and never stored. */
export const RosterInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), emails: RosterEmails }),
  z.object({ action: z.literal("remove"), emails: RosterEmails }),
  z.object({ action: z.literal("clear") }),
]);
export type RosterInput = z.infer<typeof RosterInput>;
