import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Action persistence + API authz. Real Drizzle SQL via pg-proxy so a missing
 * user_id filter shows up in captured statements. Row values are positional
 * (drizzle pg-proxy), matching Stage D Atlas tests.
 */
const captured = vi.hoisted(() => ({
  statements: [] as { sql: string; params: unknown[] }[],
  rows: [] as unknown[][][],
}));
const currentUser = vi.hoisted(() => ({
  id: "22222222-2222-4222-8222-222222222222",
  major: "Mechanical Engineering",
  majorSource: "catalog" as const,
  year: 3,
  customMajorText: null,
}));

vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  const proxy = drizzle(async (sql: string, params: unknown[]) => {
    captured.statements.push({ sql, params });
    return { rows: captured.rows.shift() ?? [] };
  });
  const batch = async (queries: readonly PromiseLike<unknown>[]) => {
    const results: unknown[] = [];
    for (const query of queries) results.push(await query);
    return results;
  };
  return { db: Object.assign(proxy, { batch }) };
});

vi.mock("@/lib/auth", () => ({
  apiOnboardedUser: async () => currentUser,
  apiUser: async () => currentUser,
}));

vi.mock("@/features/atlas/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/atlas/server")>();
  return {
    ...actual,
    loadAtlasState: async () => ({
      available: true,
      interested: [],
      dismissed: [],
      pursuing: "occ:onet:17-2141.00",
      answers: {},
    }),
  };
});

const { GET, POST, PUT } = await import("@/app/api/action/plan/route");
const { PATCH: patchTask, DELETE: deleteTaskRoute } = await import("@/app/api/action/tasks/[id]/route");
const { PATCH: patchSkill } = await import("@/app/api/action/skills/[id]/route");

const OTHER_USER = "11111111-1111-4111-8111-111111111111";
const PLAN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TASK_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const SKILL_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const now = new Date("2026-11-21T12:00:00.000Z");

function activePlanRow() {
  return [
    PLAN_ID,
    currentUser.id,
    "occ:onet:17-2141.00",
    "occupation",
    "Mechanical Engineers",
    "manual",
    "template_v1",
    "active",
    5,
    8,
    now,
    now,
  ];
}

function taskRow() {
  return [
    TASK_ID,
    PLAN_ID,
    currentUser.id,
    "Old",
    null,
    "prepare",
    "todo",
    0,
    "user",
    null,
    "Added by you.",
    null,
    null,
    now,
    now,
  ];
}

function skillRow() {
  return [
    SKILL_ID,
    PLAN_ID,
    currentUser.id,
    "Programming",
    "shared",
    "known",
    "onet",
    "unrated",
    "onet-skill:programming",
    "test",
    now,
    now,
  ];
}

function call(
  handler: (req: Request, ctx: { params: Promise<Record<string, string | string[]>> }) => Promise<Response>,
  method: string,
  body?: unknown,
  params: Record<string, string> = {},
) {
  return handler(
    new Request("http://localhost/api/action", {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve(params) },
  );
}

function actionStatements() {
  return captured.statements.filter((statement) => /action_(plans|tasks|skill_progress)/.test(statement.sql));
}

function expectScopedToCurrentUser() {
  const statements = actionStatements();
  expect(statements.length).toBeGreaterThan(0);
  for (const statement of statements) {
    expect(statement.params, statement.sql).toContain(currentUser.id);
    expect(statement.params, statement.sql).not.toContain(OTHER_USER);
    if (/^(update|delete)/i.test(statement.sql)) expect(statement.sql).toMatch(/"user_id" = \$\d+/);
  }
}

beforeEach(() => {
  captured.statements = [];
  captured.rows = [];
});

describe("Action plan APIs", () => {
  it("seeds a plan for the signed-in user only, ignoring a body userId", async () => {
    // getActivePlan: empty plan select
    captured.rows = [[]];
    // profile goal select inside draftFor
    captured.rows.push([]);
    const response = await call(POST, "POST", {
      goal: { mode: "manual", nodeId: "occ:onet:17-2141.00" },
      weeklyHours: 5,
      horizonWeeks: 8,
      userId: OTHER_USER,
    });
    expect(response.status).toBe(200);
    expectScopedToCurrentUser();
    expect(actionStatements().some((statement) => /^insert into "action_plans"/i.test(statement.sql))).toBe(true);
  });

  it("goal change archives the current plan then inserts a new one, scoped to the user", async () => {
    captured.rows = [
      [activePlanRow()], // getActivePlan plan
      [], // tasks
      [], // skills
      [], // profile for draftFor
    ];
    const response = await call(PUT, "PUT", {
      goal: { mode: "manual", nodeId: "spec:test-validation" },
      copySkillProgress: false,
    });
    expect(response.status).toBe(200);
    expectScopedToCurrentUser();
    const sql = actionStatements().map((statement) => statement.sql).join("\n");
    expect(sql).toMatch(/update "action_plans" set "status"/i);
    expect(sql).toMatch(/insert into "action_plans"/i);
  });

  it("rejects copySkillProgress: true at the body boundary", async () => {
    const response = await call(PUT, "PUT", {
      goal: { mode: "manual", nodeId: "spec:test-validation" },
      copySkillProgress: true,
    });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("invalid_body");
    expect(actionStatements()).toEqual([]);
  });
});

describe("Action task/skill APIs authz", () => {
  it("updates a task only when user_id matches the signed-in student", async () => {
    captured.rows = [[taskRow()], [activePlanRow()]];
    const response = await call(patchTask, "PATCH", { status: "done", userId: OTHER_USER }, { id: TASK_ID });
    expect(response.status).toBe(200);
    expectScopedToCurrentUser();
    expect(actionStatements().some((statement) => /^update "action_tasks"/i.test(statement.sql))).toBe(true);
  });

  it("deletes a task scoped to the signed-in user", async () => {
    captured.rows = [[taskRow()], [activePlanRow()], [[TASK_ID]]];
    const response = await call(deleteTaskRoute, "DELETE", undefined, { id: TASK_ID });
    expect(response.status).toBe(200);
    expectScopedToCurrentUser();
    expect(actionStatements().some((statement) => /^delete from "action_tasks"/i.test(statement.sql))).toBe(true);
  });

  it("updates skill progress scoped to the signed-in user", async () => {
    captured.rows = [[skillRow()], [activePlanRow()]];
    const response = await call(patchSkill, "PATCH", { progress: "learning" }, { id: SKILL_ID });
    expect(response.status).toBe(200);
    expectScopedToCurrentUser();
  });

  it("GET active plan scopes selects to the signed-in user", async () => {
    captured.rows = [[]];
    const response = await call(GET, "GET");
    expect(response.status).toBe(200);
    expectScopedToCurrentUser();
  });
});

describe("migration 0009", () => {
  const sql = readFileSync(path.join(process.cwd(), "drizzle/0009_action_plans.sql"), "utf8");
  const journal = JSON.parse(readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8")) as {
    entries: { idx: number; tag: string; when: number }[];
  };

  it("is additive, uses composite plan+user FKs, and cascades", () => {
    const statements = sql.split("--> statement-breakpoint").map((part) => part.replace(/^--.*$/gm, "").trim());
    for (const statement of statements) {
      expect(statement).not.toMatch(/^(drop|truncate|delete|update)\b/i);
      expect(statement).not.toMatch(/alter table "users"/i);
    }
    expect(sql).toContain("action_tasks_plan_user_fk");
    expect(sql).toContain("action_skill_progress_plan_user_fk");
    expect(sql).toContain("action_plans_one_active");
    expect(sql).toContain("weekly_hours");
    expect(sql).toContain("horizon_weeks");
    expect(sql).toContain("completed_at");
    expect(sql).toContain('"phase"');
    expect(sql.match(/ON DELETE cascade/gi)?.length).toBeGreaterThanOrEqual(3);
  });

  it("is in the journal after 0008", () => {
    const index = journal.entries.findIndex((entry) => entry.tag === "0009_action_plans");
    expect(index).toBeGreaterThan(0);
    expect(journal.entries[index].when > journal.entries[index - 1].when).toBe(true);
  });
});
