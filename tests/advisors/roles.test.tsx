import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// A drizzle instance that only builds SQL. It records each statement and answers from `respond`.
const captured: { sql: string; params: unknown[] }[] = [];
let respond: (sql: string) => unknown[] = () => [];
vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  const db = drizzle(async (sql, params) => {
    captured.push({ sql, params });
    return { rows: respond(sql) };
  });
  // pg-proxy has no batch; run the statements in order, as Neon's batch does inside one transaction.
  return { db: Object.assign(db, { batch: async (queries: readonly PromiseLike<unknown>[]) => { const out: unknown[] = []; for (const query of queries) out.push(await query); return out; } }) };
});
const session = { email: "student@mail.uc.edu" };
vi.mock("@/lib/auth", () => ({ apiUser: async () => ({ id: "00000000-0000-4000-8000-0000000000aa", email: session.email }) }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push() {}, refresh() {} }),
}));

import { POST as founderPost } from "@/app/api/founders/advisors/route";
import type { User } from "@/db/schema";
import { AdvisorRequestForm } from "@/features/advisors/components/advisor-request-form";
import { FounderAdvisors, NO_ADVISORS, NO_SCHOOLS } from "@/features/advisors/components/founder-advisors";
import { AdvisorRequestInput, Domain, FounderAdvisorInput, splitDomains } from "@/features/advisors/schemas";
import {
  advisorStateFor,
  founderAdvisorAction,
  requestAdvisorAccess,
  requireApprovedAdvisor,
  sortAdvisors,
} from "@/features/advisors/server";

const SCHOOL = "00000000-0000-4000-8000-00000000005c";
const advisor = { id: "00000000-0000-4000-8000-0000000000ad", email: "pat@uc.edu", school: "uc.edu", consentPrivacyAt: null } as User;
const founder = { id: "00000000-0000-4000-8000-0000000000f0" } as User;
const CTX = { params: Promise.resolve({}) };

beforeEach(() => {
  captured.length = 0;
  respond = () => [];
  process.env.FOUNDER_EMAILS = "founder@swervly.com";
  session.email = "student@mail.uc.edu";
});

describe("input rules", () => {
  it("normalizes domains and rejects anything that isn't one", () => {
    expect(Domain.parse(" @UC.EDU ")).toBe("uc.edu");
    expect(Domain.parse("mail.uc.edu")).toBe("mail.uc.edu");
    for (const bad of ["uc", "-uc.edu", "uc..edu", "uc.edu/", "u c.edu"]) expect(Domain.safeParse(bad).success).toBe(false);
    expect(splitDomains("uc.edu, mail.uc.edu;  uc.edu")).toEqual(["uc.edu", "mail.uc.edu", "uc.edu"]);
    const parsed = FounderAdvisorInput.parse({ action: "create_school", name: "University of Cincinnati", domains: ["uc.edu", "UC.EDU"] });
    expect(parsed).toEqual({ action: "create_school", name: "University of Cincinnati", domains: ["uc.edu"] });
  });

  it("an advisor request needs a name and Privacy Policy agreement, and has no school field", () => {
    expect(AdvisorRequestInput.safeParse({ displayName: "Pat Lee", agreePrivacy: true }).success).toBe(true);
    expect(AdvisorRequestInput.safeParse({ displayName: "Pat Lee", agreePrivacy: false }).success).toBe(false);
    expect(AdvisorRequestInput.safeParse({ displayName: "P", agreePrivacy: true }).success).toBe(false);
    expect(AdvisorRequestInput.parse({ displayName: "Pat Lee", agreePrivacy: true, schoolId: SCHOOL })).not.toHaveProperty("schoolId");
  });
});

describe("the advisor role check", () => {
  it("needs an approved account whose school still lists the advisor's sign-in domain", async () => {
    await expect(requireApprovedAdvisor(advisor)).rejects.toMatchObject({ status: 404 });
    const query = captured[0]!;
    expect(query.sql).toContain('inner join "school_domains" on ("school_domains"."school_id" = "advisor_accounts"."school_id" and "school_domains"."domain" = $');
    expect(query.sql).toContain('"advisor_accounts"."status" = $');
    expect(query.params).toEqual(expect.arrayContaining(["uc.edu", advisor.id, "approved"]));
  });

  it("passes with a matching row, and refuses someone with no sign-in domain without a query", async () => {
    respond = () => [["Pat Lee", SCHOOL, "University of Cincinnati"]];
    await expect(requireApprovedAdvisor(advisor)).resolves.toEqual({
      userId: advisor.id,
      displayName: "Pat Lee",
      school: { id: SCHOOL, name: "University of Cincinnati" },
    });
    captured.length = 0;
    await expect(requireApprovedAdvisor({ ...advisor, school: null } as User)).rejects.toMatchObject({ status: 404 });
    expect(captured).toEqual([]);
  });

  it("an approved advisor whose domain left the school shows as not active", async () => {
    respond = (sql) => (sql.includes('from "advisor_accounts"') ? [["approved", "Pat Lee", SCHOOL, "University of Cincinnati"]] : []);
    expect((await advisorStateFor(advisor)).kind).toBe("revoked");
  });
});

describe("asking for access", () => {
  it("refuses when the sign-in domain isn't a school, and inserts nothing", async () => {
    await expect(requestAdvisorAccess(advisor, { displayName: "Pat Lee", agreePrivacy: true })).rejects.toMatchObject({ status: 404 });
    expect(captured.some((statement) => statement.sql.startsWith("insert"))).toBe(false);
  });

  it("takes the school from the sign-in domain, records Privacy agreement only if missing, and refuses a second request", async () => {
    respond = (sql) => {
      if (sql.includes('from "school_domains"')) return [[SCHOOL, "University of Cincinnati"]];
      if (sql.startsWith('insert into "advisor_accounts"')) return [[advisor.id]];
      return [];
    };
    await expect(requestAdvisorAccess(advisor, { displayName: "Pat Lee", agreePrivacy: true })).resolves.toEqual({ status: "pending" });
    const insert = captured.find((statement) => statement.sql.startsWith('insert into "advisor_accounts"'))!;
    expect(insert.params).toEqual(expect.arrayContaining([advisor.id, SCHOOL, "Pat Lee"]));
    const consent = captured.find((statement) => statement.sql.startsWith('update "users"'))!;
    expect(consent.sql).toContain('"users"."consent_privacy_at" is null');

    respond = (sql) => (sql.includes('from "school_domains"') ? [[SCHOOL, "University of Cincinnati"]] : []);
    await expect(requestAdvisorAccess(advisor, { displayName: "Pat Lee", agreePrivacy: true })).rejects.toMatchObject({ status: 409 });
  });
});

describe("founders", () => {
  it("the route answers 404 to anyone else and runs no SQL", async () => {
    const body = JSON.stringify({ action: "decide_advisor", userId: advisor.id, decision: "approve" });
    const response = await founderPost(new Request("http://test/api/founders/advisors", { method: "POST", body, headers: { "content-type": "application/json" } }), CTX);
    expect(response.status).toBe(404);
    expect(captured).toEqual([]);
  });

  it("approve moves only from waiting or revoked and records which founder decided", async () => {
    await expect(founderAdvisorAction(founder, { action: "decide_advisor", userId: advisor.id, decision: "approve" })).rejects.toMatchObject({ status: 409 });
    const update = captured[0]!;
    expect(update.sql).toMatch(/^update "advisor_accounts" set "status" = \$1, "decided_at" = now\(\), "decided_by_user_id" = \$2/);
    expect(update.params).toEqual(["approved", founder.id, advisor.id, "pending", "revoked"]);
    captured.length = 0;
    await founderAdvisorAction(founder, { action: "decide_advisor", userId: advisor.id, decision: "revoke" }).catch(() => undefined);
    expect(captured[0]!.params).toEqual(["revoked", founder.id, advisor.id, "pending", "approved"]);
  });

  it("a domain that belongs to another school can't be added twice", async () => {
    respond = (sql) => (sql.includes('from "school_domains"') ? [["uc.edu", "00000000-0000-4000-8000-0000000000ee"]] : []);
    await expect(founderAdvisorAction(founder, { action: "create_school", name: "Another U", domains: ["uc.edu"] })).rejects.toMatchObject({ status: 409 });
    expect(captured.some((statement) => statement.sql.startsWith("insert"))).toBe(false);
  });

  it("creating a school writes the school and its domains together", async () => {
    await founderAdvisorAction(founder, { action: "create_school", name: "University of Cincinnati", domains: ["uc.edu", "mail.uc.edu"] });
    const inserts = captured.filter((statement) => statement.sql.startsWith("insert"));
    expect(inserts.map((statement) => statement.sql.split(" ")[2])).toEqual(['"schools"', '"school_domains"']);
    expect(inserts[1]!.params).toEqual(expect.arrayContaining(["uc.edu", "mail.uc.edu"]));
  });

  it("lists waiting requests first, oldest first", () => {
    const at = (iso: string) => new Date(iso);
    const sorted = sortAdvisors([
      { status: "approved", requestedAt: at("2026-11-01") },
      { status: "pending", requestedAt: at("2026-11-03") },
      { status: "revoked", requestedAt: at("2026-10-01") },
      { status: "pending", requestedAt: at("2026-11-02") },
    ]);
    expect(sorted.map((row) => `${row.status}:${row.requestedAt.toISOString().slice(5, 10)}`)).toEqual([
      "pending:11-02",
      "pending:11-03",
      "approved:11-01",
      "revoked:10-01",
    ]);
  });
});

describe("rendering", () => {
  it("founders see empty states, then schools with domains and requests with actions", () => {
    expect(renderToStaticMarkup(<FounderAdvisors schools={[]} advisors={[]} />)).toContain(NO_SCHOOLS);
    expect(renderToStaticMarkup(<FounderAdvisors schools={[]} advisors={[]} />)).toContain(NO_ADVISORS);
    const html = renderToStaticMarkup(
      <FounderAdvisors
        schools={[{ id: SCHOOL, name: "University of Cincinnati", domains: ["mail.uc.edu", "uc.edu"] }]}
        advisors={[{ userId: advisor.id, email: "pat@uc.edu", displayName: "Pat Lee", schoolName: "University of Cincinnati", status: "pending", requestedAt: new Date(), decidedAt: null }]}
      />,
    );
    expect(html).toContain("mail.uc.edu, uc.edu");
    expect(html).toContain("Pat Lee");
    expect(html).toContain("Approve");
    expect(html).toContain("Decline");
  });

  it("the request form asks for Privacy agreement only from someone who never gave it", () => {
    expect(renderToStaticMarkup(<AdvisorRequestForm schoolName="University of Cincinnati" needsPrivacy />)).toContain("I agree to the Swervly Privacy Policy.");
    expect(renderToStaticMarkup(<AdvisorRequestForm schoolName="University of Cincinnati" needsPrivacy={false} />)).not.toContain("I agree");
  });
});
