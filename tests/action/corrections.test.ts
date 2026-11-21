import { beforeEach, describe, expect, it, vi } from "vitest";

const captured = vi.hoisted(() => ({
  statements: [] as { sql: string; params: unknown[] }[],
  rows: [] as unknown[][][],
  nextError: null as unknown,
}));
const currentUser = vi.hoisted(() => ({
  id: "22222222-2222-4222-8222-222222222222",
  major: "Mechanical Engineering",
  majorSource: "catalog" as const,
  year: 3,
  customMajorText: null,
}));
const atlasPursuing = vi.hoisted(() => ({ value: "occ:onet:17-2141.00" as string | null }));

vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  const proxy = drizzle(async (sql: string, params: unknown[]) => {
    if (captured.nextError) {
      const error = captured.nextError;
      captured.nextError = null;
      throw error;
    }
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
      pursuing: atlasPursuing.value,
      answers: {},
    }),
  };
});

const { POST, PUT } = await import("@/app/api/action/plan/route");
const { PATCH: patchTask, DELETE: deleteTaskRoute } = await import("@/app/api/action/tasks/[id]/route");
const { PATCH: patchSkill } = await import("@/app/api/action/skills/[id]/route");
const { exportActionData, resolveGoalFromInput } = await import("@/features/action/server");
const { ResolveGoalInput } = await import("@/features/action/schemas");
const { isMissingActionRelation } = await import("@/features/action/db-errors");

const OTHER = "11111111-1111-4111-8111-111111111111";
const ACTIVE_PLAN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ARCHIVED_PLAN = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ACTIVE_TASK = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ARCHIVED_TASK = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const ARCHIVED_SKILL = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const now = new Date("2026-11-21T12:00:00.000Z");

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

function planRow(id: string, status: "active" | "archived", goal = "occ:onet:17-2141.00") {
  return [
    id,
    currentUser.id,
    goal,
    "occupation",
    "Mechanical Engineers",
    status === "active" ? "atlas_pursuing" : "manual",
    "template_v1",
    status,
    null,
    null,
    now,
    now,
  ];
}

function taskRow(id: string, planId: string) {
  return [
    id,
    planId,
    currentUser.id,
    "Task",
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

function skillRow(id: string, planId: string) {
  return [
    id,
    planId,
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

beforeEach(() => {
  captured.statements = [];
  captured.rows = [];
  captured.nextError = null;
  atlasPursuing.value = "occ:onet:17-2141.00";
});

describe("archived plan immutability", () => {
  it("refuses task update and delete on an archived plan", async () => {
    captured.rows = [[taskRow(ARCHIVED_TASK, ARCHIVED_PLAN)], [planRow(ARCHIVED_PLAN, "archived")]];
    const update = await call(patchTask, "PATCH", { status: "done" }, { id: ARCHIVED_TASK });
    expect(update.status).toBe(409);
    expect((await update.json()).error.code).toBe("plan_archived");

    captured.rows = [[taskRow(ARCHIVED_TASK, ARCHIVED_PLAN)], [planRow(ARCHIVED_PLAN, "archived")]];
    const remove = await call(deleteTaskRoute, "DELETE", undefined, { id: ARCHIVED_TASK });
    expect(remove.status).toBe(409);
    expect((await remove.json()).error.code).toBe("plan_archived");
  });

  it("refuses skill progress updates on an archived plan", async () => {
    captured.rows = [[skillRow(ARCHIVED_SKILL, ARCHIVED_PLAN)], [planRow(ARCHIVED_PLAN, "archived")]];
    const response = await call(patchSkill, "PATCH", { progress: "comfortable" }, { id: ARCHIVED_SKILL });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("plan_archived");
  });

  it("still allows updates on the active plan", async () => {
    captured.rows = [[taskRow(ACTIVE_TASK, ACTIVE_PLAN)], [planRow(ACTIVE_PLAN, "active")]];
    const response = await call(patchTask, "PATCH", { status: "done" }, { id: ACTIVE_TASK });
    expect(response.status).toBe(200);
  });
});

describe("atlas_pursuing is server-side only", () => {
  it("rejects a client-supplied pursuingNodeId on the wire", () => {
    expect(ResolveGoalInput.safeParse({ mode: "atlas_pursuing", pursuingNodeId: "occ:onet:29-1141.00" }).success).toBe(
      false,
    );
  });

  it("resolves atlas_pursuing from the saved Atlas mark, not a client occupation", async () => {
    atlasPursuing.value = "spec:test-validation";
    const goal = await resolveGoalFromInput(currentUser.id, { mode: "atlas_pursuing" });
    expect(goal.nodeId).toBe("spec:test-validation");
    expect(goal.source).toBe("atlas_pursuing");
  });

  it("seeds with atlas_pursuing using the server mark", async () => {
    captured.rows = [[]]; // no active plan
    captured.rows.push([]); // profile
    const response = await call(POST, "POST", {
      goal: { mode: "atlas_pursuing", pursuingNodeId: "occ:onet:29-1141.00" },
    });
    // Zod strips/rejects — invalid_body because pursuingNodeId is not allowed
    expect(response.status).toBe(400);
  });
});

describe("exportActionData failures", () => {
  it("returns empty arrays when Action tables are missing", async () => {
    captured.nextError = new Error('relation "action_plans" does not exist');
    await expect(exportActionData(currentUser.id)).resolves.toEqual({
      plans: [],
      tasks: [],
      skillProgress: [],
    });
  });

  it("rethrows unexpected database errors instead of emptying the export", async () => {
    captured.nextError = new Error("connection reset by peer");
    await expect(exportActionData(currentUser.id)).rejects.toThrow();
    // Must not swallow into empty arrays — caller must see a failure after 0009.
    try {
      captured.nextError = new Error("connection reset by peer");
      await exportActionData(currentUser.id);
      expect.unreachable("expected throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect(isMissingActionRelation(error)).toBe(false);
    }
  });
});

describe("concurrency / one active plan", () => {
  it("maps a unique violation on seed to a controlled 409", async () => {
    // Race: getActivePlan sees none, then insert hits one-active unique.
    captured.rows = [[], []]; // active plan select; profile select
    const { db } = await import("@/db");
    vi.spyOn(db, "batch").mockRejectedValueOnce(Object.assign(new Error("duplicate"), { code: "23505" }));

    const response = await call(POST, "POST", { goal: { mode: "manual", nodeId: "occ:onet:17-2141.00" } });
    expect(response.status).toBe(409);
    expect((await response.json()).error.code).toBe("plan_exists");
    vi.mocked(db.batch).mockRestore();
  });

  it("archives and creates in one batch (history intact on the archived id)", async () => {
    captured.rows = [
      [planRow(ACTIVE_PLAN, "active")],
      [],
      [],
      [], // profile
    ];
    const response = await call(PUT, "PUT", {
      goal: { mode: "manual", nodeId: "spec:test-validation" },
      copySkillProgress: false,
    });
    expect(response.status).toBe(200);
    const sql = captured.statements.map((s) => s.sql).join("\n");
    expect(sql).toMatch(/update "action_plans" set "status"/i);
    expect(sql).toMatch(/insert into "action_plans"/i);
    expect(captured.statements.some((s) => s.params.includes(ACTIVE_PLAN) && /^update/i.test(s.sql))).toBe(true);
  });
});

describe("cross-user noise", () => {
  it("ignores another user id in the body when seeding", async () => {
    captured.rows = [[], []];
    const response = await call(POST, "POST", {
      goal: { mode: "manual", nodeId: "occ:onet:17-2141.00" },
      userId: OTHER,
    });
    expect(response.status).toBe(200);
    for (const statement of captured.statements.filter((s) => /action_/.test(s.sql))) {
      expect(statement.params).toContain(currentUser.id);
      expect(statement.params).not.toContain(OTHER);
    }
  });
});
