import { DrizzleQueryError } from "drizzle-orm/errors";
import { describe, expect, it } from "vitest";
import { isUniqueViolation, resultRows } from "@/lib/db-errors";

describe("resultRows", () => {
  it("reads the Neon { rows } shape and the plain array shape", () => {
    expect(resultRows({ rows: [{ id: 1 }] })).toEqual([{ id: 1 }]);
    expect(resultRows([{ id: 2 }])).toEqual([{ id: 2 }]);
  });

  it("returns no rows for anything else", () => {
    expect(resultRows(null)).toEqual([]);
    expect(resultRows({ rows: "nope" })).toEqual([]);
    expect(resultRows({ rowCount: 1 })).toEqual([]);
  });
});

describe("isUniqueViolation", () => {
  const neon = (constraint: string) => Object.assign(new Error("duplicate key"), { code: "23505", constraint });

  it("matches 23505 directly, wrapped by Drizzle, or deeper in the chain", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation(new DrizzleQueryError("insert", [], neon("a_uq")))).toBe(true);
    expect(isUniqueViolation({ cause: { cause: neon("a_uq") } }, "a_uq")).toBe(true);
  });

  it("checks the constraint only when one is given", () => {
    expect(isUniqueViolation(neon("a_uq"), "b_uq")).toBe(false);
    expect(isUniqueViolation(neon("a_uq"))).toBe(true);
  });

  it("ignores other codes, plain strings and cycles", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation("23505")).toBe(false);
    expect(isUniqueViolation(new Error("duplicate key value"))).toBe(false);
    const cycle: { cause?: unknown } = {};
    cycle.cause = cycle;
    expect(isUniqueViolation(cycle)).toBe(false);
  });
});
