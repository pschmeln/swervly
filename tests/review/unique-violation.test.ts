import { DrizzleQueryError } from "drizzle-orm/errors";
import { describe, expect, it } from "vitest";

import { isUniqueViolation } from "@/features/review/server";

const EMPLOYER = "employers_normalized_name_uq";
const ROTATION = "rotations_user_number_uq";

function neonUniqueViolation(constraint: string): Error {
  return Object.assign(
    new Error(`duplicate key value violates unique constraint "${constraint}"`),
    {
      name: "NeonDbError",
      code: "23505",
      constraint,
      severity: "ERROR",
    },
  );
}

describe("isUniqueViolation", () => {
  it("matches an unwrapped Neon error, including a plain code/constraint object", () => {
    expect(isUniqueViolation(neonUniqueViolation(ROTATION), ROTATION)).toBe(
      true,
    );
    expect(
      isUniqueViolation({ code: "23505", constraint: EMPLOYER }, EMPLOYER),
    ).toBe(true);
  });

  it("matches a DrizzleQueryError whose cause is the Neon unique violation", () => {
    const cause = neonUniqueViolation(EMPLOYER);
    const wrapped = new DrizzleQueryError(
      'insert into "employers" ("id", "normalized_name") values ($1, $2)',
      ["id", "acme"],
      cause,
    );

    expect(wrapped).not.toHaveProperty("code");
    expect(wrapped.cause).toBe(cause);
    expect(isUniqueViolation(wrapped, EMPLOYER)).toBe(true);
    expect(isUniqueViolation(wrapped, ROTATION)).toBe(false);
  });

  it("walks a nested cause chain", () => {
    const pg = neonUniqueViolation(ROTATION);
    const middle = new Error("query failed");
    middle.cause = pg;
    const wrapped = new DrizzleQueryError(
      'insert into "rotations"',
      [],
      middle,
    );

    expect(isUniqueViolation(wrapped, ROTATION)).toBe(true);
  });

  it("rejects a different constraint, a different SQLSTATE, and a cause cycle", () => {
    expect(isUniqueViolation(neonUniqueViolation(EMPLOYER), ROTATION)).toBe(
      false,
    );

    const foreignKey = Object.assign(new Error("insert or update"), {
      code: "23503",
      constraint: EMPLOYER,
    });
    expect(isUniqueViolation(foreignKey, EMPLOYER)).toBe(false);
    expect(
      isUniqueViolation(
        new DrizzleQueryError("insert into employers", [], foreignKey),
        EMPLOYER,
      ),
    ).toBe(false);

    const cycle: { cause?: unknown } = {};
    cycle.cause = cycle;
    expect(isUniqueViolation(cycle, EMPLOYER)).toBe(false);
    expect(isUniqueViolation(null, EMPLOYER)).toBe(false);
    expect(isUniqueViolation("23505", EMPLOYER)).toBe(false);
  });
});
