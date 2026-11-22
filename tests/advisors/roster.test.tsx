import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A drizzle instance that only builds SQL. It records each statement and answers from `respond`.
const captured: { sql: string; params: unknown[] }[] = [];
let respond: (sql: string) => unknown[] = () => [];
vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  const db = drizzle(async (sql, params) => {
    captured.push({ sql, params });
    return { rows: respond(sql) };
  });
  return { db: Object.assign(db, { batch: async (queries: readonly PromiseLike<unknown>[]) => { const out: unknown[] = []; for (const query of queries) out.push(await query); return out; } }) };
});
vi.mock("@/lib/auth", () => ({ apiUser: async () => ({ id: "00000000-0000-4000-8000-0000000000aa", email: "someone@mail.uc.edu", school: "mail.uc.edu" }) }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push() {}, refresh() {} }),
}));

import PrivacyPage from "@/app/privacy/page";
import { POST as rosterPost } from "@/app/api/advisors/roster/route";
import { AdvisorDashboardView, FEWER_THAN_TWO, ROSTER_OFF } from "@/features/advisors/components/advisor-dashboard";
import { ADVISOR_CONSENT_VERSION } from "@/features/advisors/consent";
import { extractEmails, ROSTER_BATCH_MAX } from "@/features/advisors/emails";
import { changeRoster, groupStats, optedInRosterIds, type GroupStats, type StudentFacts } from "@/features/advisors/roster";
import { RosterInput } from "@/features/advisors/schemas";
import type { ApprovedAdvisor } from "@/features/advisors/server";
import { atlasGraph } from "@/features/atlas/graph";
import { POLICY_CHANGES } from "@/features/privacy/agree";
import { PRIVACY_POLICY_VERSION } from "@/features/privacy/policy-version";
import { emailHashSecret, emailHmac } from "@/lib/email-hash";

const SECRET = "test-secret-that-is-long-enough-1234567890";
const SCHOOL = "00000000-0000-4000-8000-00000000005c";
const advisor: ApprovedAdvisor = { userId: "00000000-0000-4000-8000-0000000000ad", displayName: "Pat Lee", school: { id: SCHOOL, name: "University of Cincinnati" } };

beforeEach(() => {
  captured.length = 0;
  respond = () => [];
  process.env.EMAIL_HASH_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.EMAIL_HASH_SECRET;
});

describe("email hashing", () => {
  it("is stable across case and spaces, depends on the secret, and needs a real secret", () => {
    expect(emailHmac(" Ann@Mail.UC.edu ", SECRET)).toBe(emailHmac("ann@mail.uc.edu", SECRET));
    expect(emailHmac("ann@mail.uc.edu", SECRET)).not.toBe(emailHmac("ann@mail.uc.edu", `${SECRET}x`));
    expect(emailHmac("ann@mail.uc.edu", SECRET)).toMatch(/^[0-9a-f]{64}$/);
    process.env.EMAIL_HASH_SECRET = "short";
    expect(emailHashSecret()).toBeNull();
  });

  it("pulls addresses out of a pasted list or a CSV", () => {
    const csv = 'name,email\n"Lee, Ann",Ann@Mail.UC.edu\nBo,bo@mail.uc.edu\nBo again,BO@mail.uc.edu\nno email here,';
    expect(extractEmails(csv)).toEqual(["ann@mail.uc.edu", "bo@mail.uc.edu"]);
    expect(extractEmails("a@x.edu; b@y.edu c@z.edu")).toEqual(["a@x.edu", "b@y.edu", "c@z.edu"]);
  });

  it("limits a roster request and checks every address", () => {
    expect(RosterInput.safeParse({ action: "add", emails: ["ann@mail.uc.edu"] }).success).toBe(true);
    expect(RosterInput.safeParse({ action: "add", emails: ["not an email"] }).success).toBe(false);
    expect(RosterInput.safeParse({ action: "add", emails: Array.from({ length: ROSTER_BATCH_MAX + 1 }, (_, i) => `s${i}@mail.uc.edu`) }).success).toBe(false);
  });
});

describe("roster changes", () => {
  it("stores hashes, never addresses, scoped to the advisor's school, and answers only with the roster size", async () => {
    respond = (sql) => (sql.startsWith("select count") ? [[3]] : []);
    const result = await changeRoster(advisor, { action: "add", emails: ["Ann@mail.uc.edu", "ann@mail.uc.edu", "bo@mail.uc.edu"] });
    expect(result).toEqual({ rosterSize: 3 });
    const insert = captured.find((statement) => statement.sql.startsWith('insert into "advisor_roster"'))!;
    expect(insert.params).toContain(SCHOOL);
    expect(insert.params).toContain(emailHmac("ann@mail.uc.edu", SECRET));
    expect(insert.params).toContain(emailHmac("bo@mail.uc.edu", SECRET));
    expect(JSON.stringify(captured)).not.toContain("@");
    // The duplicate (case only) became one row.
    expect(insert.params.filter((value) => value === emailHmac("ann@mail.uc.edu", SECRET))).toHaveLength(1);
  });

  it("removing and clearing touch only this school's rows", async () => {
    await changeRoster(advisor, { action: "remove", emails: ["ann@mail.uc.edu"] });
    expect(captured[0]!.sql).toMatch(/^delete from "advisor_roster" where \("advisor_roster"."school_id" = \$1 and "advisor_roster"."email_hmac" in \(\$2\)\)/);
    expect(captured[0]!.params).toEqual([SCHOOL, emailHmac("ann@mail.uc.edu", SECRET)]);
    captured.length = 0;
    await changeRoster(advisor, { action: "clear" });
    expect(captured[0]).toEqual({ sql: 'delete from "advisor_roster" where "advisor_roster"."school_id" = $1', params: [SCHOOL] });
  });

  it("without the secret, adding refuses before any SQL", async () => {
    delete process.env.EMAIL_HASH_SECRET;
    await expect(changeRoster(advisor, { action: "add", emails: ["ann@mail.uc.edu"] })).rejects.toMatchObject({ status: 503 });
    expect(captured).toEqual([]);
  });

  it("the route answers 'not found' to anyone who isn't an approved advisor, and changes nothing", async () => {
    const body = JSON.stringify({ action: "clear" });
    const response = await rosterPost(new Request("http://test/api/advisors/roster", { method: "POST", body, headers: { "content-type": "application/json" } }), { params: Promise.resolve({}) });
    expect(response.status).toBe(404);
    expect(captured.every((statement) => statement.sql.startsWith("select"))).toBe(true);
  });
});

describe("who roster stats count", () => {
  it("only students with an active grant for this school, matched by hash; with no grants, nothing else is read", async () => {
    expect(await optedInRosterIds(SCHOOL, SECRET)).toEqual([]);
    expect(captured).toHaveLength(1);
    expect(captured[0]!.sql).toContain('"advisor_grants"."revoked_at" is null');
    expect(captured[0]!.sql).toContain('"advisor_grants"."consent_version" = $');
    expect(captured[0]!.params).toEqual([SCHOOL, ADVISOR_CONSENT_VERSION]);
  });

  it("returns granted students whose hash is on the roster", async () => {
    respond = (sql) => {
      if (sql.includes('from "advisor_grants"')) return [["s1", "ann@mail.uc.edu"], ["s2", "bo@mail.uc.edu"]];
      if (sql.includes('from "advisor_roster"')) return [[emailHmac("bo@mail.uc.edu", SECRET)]];
      return [];
    };
    expect(await optedInRosterIds(SCHOOL, SECRET)).toEqual(["s2"]);
    const rosterQuery = captured.find((statement) => statement.sql.includes('from "advisor_roster"'))!;
    expect(JSON.stringify(rosterQuery.params)).not.toContain("@");
  });
});

describe("stats", () => {
  const occupation = [...atlasGraph().nodes.values()].find((node) => node.id.startsWith("occ:"))!;
  const student = (over: Partial<StudentFacts>): StudentFacts => ({
    id: Math.random().toString(36),
    onboarded: true,
    quizDone: true,
    reviewed: false,
    directionNodeId: null,
    employerNames: [],
    ...over,
  });

  it("withholds any count or list row from fewer than 2 students", () => {
    const stats = groupStats([
      student({ reviewed: true, employerNames: ["GE Aerospace"], directionNodeId: occupation.id }),
      student({ onboarded: false, quizDone: false }),
    ]);
    expect(stats.students).toBe(2);
    expect(stats.onboarded).toBeNull();
    expect(stats.reviewed).toBeNull();
    expect(stats.topCompanies).toEqual([]);
    expect(stats.topDirections).toEqual([]);
    expect(groupStats([student({})]).students).toBeNull();
  });

  it("counts each student once per company and direction, and ranks by students", () => {
    const stats = groupStats([
      student({ reviewed: true, employerNames: ["GE Aerospace", "GE Aerospace"], directionNodeId: occupation.id }),
      student({ reviewed: true, employerNames: ["GE Aerospace", "Honda"], directionNodeId: occupation.id }),
      student({ reviewed: true, employerNames: ["Honda", "GE Aerospace"] }),
    ]);
    expect(stats.reviewed).toBe(3);
    expect(stats.topCompanies).toEqual([
      { label: "GE Aerospace", students: 3 },
      { label: "Honda", students: 2 },
    ]);
    expect(stats.topDirections).toEqual([{ label: occupation.title, students: 2 }]);
  });

  it("renders withheld numbers as 'Fewer than 2', says when the roster is off, and shows no addresses", () => {
    const empty: GroupStats = { students: null, onboarded: null, quizDone: null, reviewed: null, topDirections: [], topCompanies: [] };
    const html = renderToStaticMarkup(<AdvisorDashboardView dashboard={{ rosterEnabled: false, rosterSize: 0, roster: empty, school: { ...empty, students: 12 }, students: [] }} />);
    expect(html).toContain(FEWER_THAN_TWO);
    expect(html).toContain(ROSTER_OFF.split("'")[0]!);
    expect(html).toContain(">12<");
    expect(html).not.toContain("@");
    const on = renderToStaticMarkup(<AdvisorDashboardView dashboard={{ rosterEnabled: true, rosterSize: 5, roster: empty, school: empty, students: [] }} />);
    expect(on).toContain("5 emails on your roster");
  });
});

describe("privacy", () => {
  it("version 4 says what advisors see, and the update page lists it", () => {
    expect(PRIVACY_POLICY_VERSION).toBe(4);
    expect(POLICY_CHANGES[4]?.join(" ")).toContain("advisors");
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(html).toContain("keyed hash of each address");
    expect(html).toContain("fewer than 2 students is hidden");
  });
});
