import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Stage D: saved Career Atlas choices. The real Drizzle query builder runs
 * through drizzle's pg-proxy driver, which records every SQL statement and its
 * parameters, so a missing user_id filter shows up in the captured SQL.
 */
const captured = vi.hoisted(() => ({
  statements: [] as { sql: string; params: unknown[] }[],
  rows: [] as unknown[][][],
}));
const currentUser = vi.hoisted(() => ({ id: "22222222-2222-4222-8222-222222222222" }));

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
  apiOnboardedUser: async () => ({ id: currentUser.id }),
  apiUser: async () => ({ id: currentUser.id }),
}));

const { PUT: putMark } = await import("@/app/api/atlas/marks/route");
const { PUT: putAnswer, DELETE: clearAnswersRoute } = await import("@/app/api/atlas/answers/route");
const { AnswerInput, loadAtlasState, MarkInput, toState } = await import("@/features/atlas/server");

const OTHER_USER = "11111111-1111-4111-8111-111111111111";

function call(handler: typeof putMark, method: string, body?: unknown) {
  return handler(
    new Request("http://localhost/api/atlas", {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { params: Promise.resolve({}) },
  );
}

function atlasStatements() {
  return captured.statements.filter((statement) => /career_atlas_/.test(statement.sql));
}

function expectScopedToCurrentUser() {
  const statements = atlasStatements();
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

describe("saving marks", () => {
  it("saves Interested for the signed-in student only, ignoring any user id in the body", async () => {
    const response = await call(putMark, "PUT", { nodeId: "fam:finance", mark: "interested", userId: OTHER_USER });
    expect(response.status).toBe(200);
    expectScopedToCurrentUser();
    expect(atlasStatements()[0].sql).toMatch(/^insert into "career_atlas_marks"/);
    expect(atlasStatements()[0].sql).toMatch(/on conflict/);
  });

  it("choosing a direction demotes the old one to Interested, for this student only", async () => {
    const response = await call(putMark, "PUT", { nodeId: "spec:cfd-simulation", mark: "pursuing" });
    expect(response.status).toBe(200);
    expectScopedToCurrentUser();
    const [demote, upsert] = atlasStatements();
    expect(demote.sql).toMatch(/^update "career_atlas_marks" set "mark" = \$1/);
    expect(demote.params).toContain("interested");
    expect(upsert.sql).toMatch(/^insert into "career_atlas_marks"/);
  });

  it("clearing a mark deletes only that node for this student", async () => {
    await call(putMark, "PUT", { nodeId: "fam:finance", mark: null });
    expectScopedToCurrentUser();
    const [remove] = atlasStatements();
    expect(remove.sql).toMatch(/^delete from "career_atlas_marks" where/);
    expect(remove.params).toContain("fam:finance");
  });

  it("rejects unknown nodes, domains, and a family as a direction, without touching the database", async () => {
    for (const body of [
      { nodeId: "fam:nope", mark: "interested" },
      { nodeId: "dom:business", mark: "interested" },
      { nodeId: "fam:finance", mark: "pursuing" },
      { nodeId: "fam:finance", mark: "loved" },
    ]) {
      const response = await call(putMark, "PUT", body);
      expect(response.status, JSON.stringify(body)).toBe(400);
    }
    expect(atlasStatements()).toEqual([]);
  });
});

describe("saving answers", () => {
  it("saves and clears answers for the signed-in student only", async () => {
    expect((await call(putAnswer, "PUT", { questionId: "build-vs-model", answer: "b" })).status).toBe(200);
    expect((await call(putAnswer, "PUT", { questionId: "build-vs-model", answer: null })).status).toBe(200);
    expect((await call(clearAnswersRoute, "DELETE")).status).toBe(200);
    expectScopedToCurrentUser();
    expect(atlasStatements().map((statement) => statement.sql.split(" ")[0])).toEqual(["insert", "delete", "delete"]);
  });

  it("rejects unknown questions and answers", async () => {
    expect((await call(putAnswer, "PUT", { questionId: "favorite-color", answer: "a" })).status).toBe(400);
    expect((await call(putAnswer, "PUT", { questionId: "build-vs-model", answer: "maybe" })).status).toBe(400);
    expect(atlasStatements()).toEqual([]);
  });
});

describe("loading saved state", () => {
  it("reads only this student's rows and drops anything no longer in the map", async () => {
    captured.rows = [
      [["fam:finance", "interested"], ["spec:cfd-simulation", "pursuing"], ["fam:retired-family", "dismissed"]],
      [["build-vs-model", "a"], ["retired-question", "b"]],
    ];
    const state = await loadAtlasState(currentUser.id);
    expectScopedToCurrentUser();
    expect(state.available).toBe(true);
    expect(state.pursuing).toBe("spec:cfd-simulation");
    expect(state.interested).toEqual(["fam:finance", "spec:cfd-simulation"]);
    expect(state.dismissed).toEqual([]);
    expect(state.answers).toEqual({ "build-vs-model": "a" });
  });

  it("falls back to on-screen only when the tables are missing", async () => {
    const failing = vi.spyOn(console, "error").mockImplementation(() => undefined);
    captured.rows = [];
    const { db } = await import("@/db");
    const spy = vi.spyOn(db, "batch").mockRejectedValueOnce(new Error('relation "career_atlas_marks" does not exist'));
    const state = await loadAtlasState(currentUser.id);
    expect(state).toEqual({ available: false, interested: [], dismissed: [], pursuing: null, answers: {} });
    spy.mockRestore();
    failing.mockRestore();
  });

  it("parses inputs strictly", () => {
    expect(MarkInput.safeParse({ nodeId: "occ:onet:17-2141.00", mark: "pursuing" }).success).toBe(true);
    expect(AnswerInput.safeParse({ questionId: "people-vs-data", answer: "both" }).success).toBe(true);
    expect(toState([{ nodeId: "occ:onet:17-2141.00", mark: "weird" }], []).interested).toEqual([]);
  });
});

describe("migration 0007", () => {
  const sql = readFileSync(path.join(process.cwd(), "drizzle/0007_career_atlas_marks.sql"), "utf8");
  const journal = JSON.parse(readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8")) as {
    entries: { idx: number; tag: string; when: number }[];
  };

  it("is additive and cascades on account deletion", () => {
    const statements = sql.split("--> statement-breakpoint").map((part) => part.replace(/^--.*$/gm, "").trim());
    for (const statement of statements) {
      expect(statement).not.toMatch(/^(drop|truncate|delete|update)\b/i);
      expect(statement).not.toMatch(/alter table "users"/i);
      expect(statement).not.toMatch(/\bdrop\b/i);
    }
    expect(sql.match(/ON DELETE cascade/g)?.length).toBe(2);
    expect(sql).toContain("career_atlas_marks_one_pursuing");
  });

  it("is the last journal entry, with a later timestamp than the one before", () => {
    const last = journal.entries.at(-1);
    const before = journal.entries.at(-2);
    expect(last?.tag).toBe("0007_career_atlas_marks");
    expect((last?.when ?? 0) > (before?.when ?? 0)).toBe(true);
  });

  it("allows every real Atlas id and rejects others in its check constraint", async () => {
    const { atlasGraph } = await import("@/features/atlas/graph");
    const pattern = new RegExp(/node_id" ~ '([^']+)'/.exec(sql)?.[1] ?? "^$");
    for (const node of atlasGraph().nodes.values()) expect(pattern.test(node.id), node.id).toBe(true);
    for (const bad of ["fam:Finance", "occ:onet:17-2141", "role:design", "fam:finance; drop table users"]) expect(pattern.test(bad), bad).toBe(false);
  });
});
