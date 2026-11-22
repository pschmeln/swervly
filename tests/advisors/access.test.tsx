import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// A drizzle instance that only builds SQL. It records each statement and answers from `respond`.
const captured: { sql: string; params: unknown[] }[] = [];
let respond: (sql: string, params: unknown[]) => unknown[] = () => [];
vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  const db = drizzle(async (sql, params) => {
    captured.push({ sql, params });
    return { rows: respond(sql, params) };
  });
  return { db: Object.assign(db, { batch: async (queries: readonly PromiseLike<unknown>[]) => { const out: unknown[] = []; for (const query of queries) out.push(await query); return out; } }) };
});
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push() {}, refresh() {} }),
}));

import { INSTRUMENT } from "@/content/mini-ipip";
import type { User } from "@/db/schema";
import {
  grantStatus,
  loadStudentDetail,
  requireStudentAccess,
  setAdvisorGrant,
  shouldPromptRoster,
  viewStudent,
  type StudentAdvisorState,
} from "@/features/advisors/access";
import { AdvisorSharing, NO_VIEWS } from "@/features/advisors/components/advisor-sharing";
import { StudentDetailView } from "@/features/advisors/components/student-detail";
import { ADVISOR_CONSENT_VERSION, ADVISOR_FIELD_IDS, ADVISOR_FIELDS, ROSTER_PROMPT } from "@/features/advisors/consent";
import type { ApprovedAdvisor } from "@/features/advisors/server";
import { emailHmac } from "@/lib/email-hash";

const SECRET = "test-secret-that-is-long-enough-1234567890";
const UC = "00000000-0000-4000-8000-0000000000c1";
const OSU = "00000000-0000-4000-8000-0000000000c2";
const STUDENT = "00000000-0000-4000-8000-0000000000a1";
const EMAIL = "ann@mail.uc.edu";
const ucAdvisor: ApprovedAdvisor = { userId: "00000000-0000-4000-8000-0000000000ad", displayName: "Pat Lee", school: { id: UC, name: "University of Cincinnati" } };
const osuAdvisor: ApprovedAdvisor = { userId: "00000000-0000-4000-8000-0000000000ae", displayName: "Sam Ray", school: { id: OSU, name: "Ohio State" } };
const student = { id: STUDENT, email: EMAIL, school: "mail.uc.edu" } as User;

/**
 * A tiny model of the database: one student who granted UC (or not), revoked (or not), on UC's
 * roster (or not). The grant query only matches when the advisor's school, "not revoked" and the
 * current consent version are all in it, exactly as the real SQL requires.
 */
const world = { grantSchool: UC as string | null, revoked: false, version: ADVISOR_CONSENT_VERSION, onRoster: true };
function model(sql: string, params: unknown[]): unknown[] {
  if (sql.startsWith('update "advisor_grants"')) {
    world.revoked = true;
    return [];
  }
  if (sql.includes('from "advisor_grants" inner join "users"')) {
    const matches =
      world.grantSchool !== null &&
      params.includes(world.grantSchool) &&
      params.includes(STUDENT) &&
      !world.revoked &&
      sql.includes('"advisor_grants"."revoked_at" is null') &&
      params.includes(world.version) &&
      world.version === ADVISOR_CONSENT_VERSION;
    return matches ? [[EMAIL]] : [];
  }
  if (sql.includes('from "advisor_roster"')) {
    return world.onRoster && params.includes(UC) && params.includes(emailHmac(EMAIL, SECRET)) ? [[1]] : [];
  }
  if (sql.includes('from "school_domains"')) return params.includes("mail.uc.edu") ? [[UC, "University of Cincinnati"]] : [];
  return [];
}

beforeEach(() => {
  captured.length = 0;
  Object.assign(world, { grantSchool: UC, revoked: false, version: ADVISOR_CONSENT_VERSION, onRoster: true });
  respond = model;
  process.env.EMAIL_HASH_SECRET = SECRET;
});
afterEach(() => {
  delete process.env.EMAIL_HASH_SECRET;
});

const studentDataRead = () => captured.some((statement) => /from "(rotations|assessments|profiles|career_atlas_marks)"/.test(statement.sql));
const logWritten = () => captured.some((statement) => statement.sql.startsWith('insert into "advisor_view_log"'));

describe("who an advisor can see", () => {
  it("a student with a grant, on the roster, is visible to their own school's advisor", async () => {
    await expect(requireStudentAccess(ucAdvisor, STUDENT)).resolves.toEqual({ email: EMAIL });
  });

  it("an advisor cannot see a student who didn't opt in: not found, no data read, no log row", async () => {
    world.grantSchool = null;
    await expect(viewStudent(ucAdvisor, STUDENT)).rejects.toMatchObject({ status: 404 });
    expect(studentDataRead()).toBe(false);
    expect(logWritten()).toBe(false);
  });

  it("an advisor cannot see another school's students, even ones who opted in there", async () => {
    await expect(viewStudent(osuAdvisor, STUDENT)).rejects.toMatchObject({ status: 404 });
    const grantQuery = captured.find((statement) => statement.sql.includes('from "advisor_grants"'))!;
    expect(grantQuery.params).toContain(OSU);
    expect(grantQuery.params).not.toContain(UC);
    expect(studentDataRead()).toBe(false);
  });

  it("access ends the moment the student stops sharing", async () => {
    await expect(requireStudentAccess(ucAdvisor, STUDENT)).resolves.toBeTruthy();
    await setAdvisorGrant(student, { schoolId: UC, share: false });
    const revoke = captured.find((statement) => statement.sql.startsWith('update "advisor_grants"'))!;
    expect(revoke.sql).toMatch(/set "revoked_at" = now\(\)/);
    expect(revoke.params).toEqual(expect.arrayContaining([STUDENT, UC]));
    captured.length = 0;
    await expect(viewStudent(ucAdvisor, STUDENT)).rejects.toMatchObject({ status: 404 });
    expect(studentDataRead()).toBe(false);
  });

  it("a grant under an older consent wording doesn't count", async () => {
    world.version = ADVISOR_CONSENT_VERSION - 1;
    await expect(requireStudentAccess(ucAdvisor, STUDENT)).rejects.toMatchObject({ status: 404 });
    expect(grantStatus({ revokedAt: null, consentVersion: ADVISOR_CONSENT_VERSION - 1 })).toBe("outdated");
  });

  it("a student who opted in but isn't on the roster stays hidden", async () => {
    world.onRoster = false;
    await expect(requireStudentAccess(ucAdvisor, STUDENT)).rejects.toMatchObject({ status: 404 });
  });

  it("with no roster secret, nobody is visible", async () => {
    delete process.env.EMAIL_HASH_SECRET;
    await expect(requireStudentAccess(ucAdvisor, STUDENT)).rejects.toMatchObject({ status: 404 });
    expect(captured).toEqual([]);
  });
});

describe("the view log", () => {
  it("writes who, which school and which fields before reading any student data", async () => {
    await viewStudent(ucAdvisor, STUDENT);
    const logIndex = captured.findIndex((statement) => statement.sql.startsWith('insert into "advisor_view_log"'));
    const firstRead = captured.findIndex((statement) => /from "(rotations|assessments|profiles|career_atlas_marks)"/.test(statement.sql));
    expect(logIndex).toBeGreaterThan(-1);
    expect(logIndex).toBeLessThan(firstRead);
    expect(captured[logIndex]!.params).toEqual(expect.arrayContaining([ucAdvisor.userId, "Pat Lee", STUDENT, UC]));
    // Drizzle sends the text[] as a Postgres array literal.
    expect(captured[logIndex]!.params).toContain(`{${ADVISOR_FIELD_IDS.map((id) => `"${id}"`).join(",")}}`);
  });
});

describe("what an advisor sees", () => {
  it("never reads pay, and shows a written note only when the student shared it", async () => {
    respond = (sql) => {
      if (sql.includes('from "users"')) return [["Electrical Engineering", "catalog", null, 3]];
      if (sql.includes('from "profiles"')) return [["industry"]];
      if (sql.includes('from "assessments"')) return [[INSTRUMENT, { extraversion: 12, agreeableness: 12, conscientiousness: 19, neuroticism: 12, openness: 12 }]];
      if (sql.includes('from "rotations"'))
        return [
          ["GE Aerospace", "Test engineer", "test_validation", "summer", 2026, 1, "yes", 4, 5, 3, 4, "Shared note.", true],
          ["Honda", "Line engineer", "manufacturing", "fall", 2026, 2, "maybe", 3, 3, 3, 3, "Private note.", false],
        ];
      return [];
    };
    const detail = await loadStudentDetail(STUDENT, EMAIL);
    expect(captured.some((statement) => statement.sql.includes("pay_hourly"))).toBe(false);
    expect(detail.coops.map((coop) => coop.sharedNote)).toEqual(["Shared note.", null]);
    expect(detail.goal).toBe("Industry");
    expect(detail.archetype?.name).toBe("The Planner");
    const html = renderToStaticMarkup(<StudentDetailView detail={detail} />);
    expect(html).toContain("Shared note.");
    expect(html).not.toContain("Private note.");
    expect(html).not.toContain("$");
  });
});

describe("the student's choice", () => {
  it("can only share with the school their own sign-in email belongs to", async () => {
    await expect(setAdvisorGrant(student, { schoolId: OSU, share: true, version: ADVISOR_CONSENT_VERSION })).rejects.toMatchObject({ status: 404 });
    expect(captured.some((statement) => /^(insert|update)/.test(statement.sql))).toBe(false);
  });

  it("must have read the current wording, and sharing again clears an old stop", async () => {
    await expect(setAdvisorGrant(student, { schoolId: UC, share: true, version: 0 })).rejects.toMatchObject({ status: 409 });
    await setAdvisorGrant(student, { schoolId: UC, share: true, version: ADVISOR_CONSENT_VERSION });
    const upsert = captured.find((statement) => statement.sql.startsWith('insert into "advisor_grants"'))!;
    expect(upsert.sql).toContain('on conflict ("student_user_id","school_id") do update set');
    expect(upsert.sql).toMatch(/do update set .*"revoked_at" = (null|\$\d+)/);
    expect(upsert.sql.includes('"revoked_at" = null') || upsert.params.includes(null)).toBe(true);
  });

  it("Home asks only when listed on the roster and never answered", async () => {
    expect(await shouldPromptRoster(student)).toBe(true);
    respond = (sql, params) => (sql.includes('from "advisor_grants"') ? [[1]] : model(sql, params));
    expect(await shouldPromptRoster(student)).toBe(false);
  });

  it("Settings lists exactly what advisors would see, the roster prompt, and every view", () => {
    const state: StudentAdvisorState = {
      school: { id: UC, name: "University of Cincinnati" },
      status: "never",
      advisorNames: ["Pat Lee"],
      onRoster: true,
      log: [],
    };
    const html = renderToStaticMarkup(<AdvisorSharing state={state} />);
    expect(html).toContain(ROSTER_PROMPT.split("'")[0]!);
    for (const field of ADVISOR_FIELDS) expect(html).toContain(field.label.split("'")[0]!);
    expect(html).toContain("Your pay");
    expect(html).toContain(NO_VIEWS);
    const sharing = renderToStaticMarkup(
      <AdvisorSharing state={{ ...state, status: "sharing", log: [{ advisorName: "Pat Lee", schoolName: "University of Cincinnati", viewedAt: new Date("2026-11-22T15:00:00Z"), fields: ["profile", "ratings"] }] }} />,
    );
    expect(sharing).toContain("Stop sharing");
    expect(sharing).toContain("Pat Lee");
    expect(sharing).toContain("Saw: Profile basics, Your review ratings, plus any written notes you already chose to share");
  });
});
