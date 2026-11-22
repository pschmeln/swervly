import { describe, expect, it } from "vitest";
import { isMissingActionRelation, isUniqueViolation } from "@/features/action/db-errors";

describe("Action db error classification", () => {
  it("detects unique violations by SQLSTATE 23505", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ cause: { code: "23505" } })).toBe(true);
    expect(isUniqueViolation(new Error("duplicate"))).toBe(false);
  });

  it("detects missing Action relations only", () => {
    expect(isMissingActionRelation(new Error('relation "action_plans" does not exist'))).toBe(true);
    expect(isMissingActionRelation(new Error("action_tasks: undefined_table"))).toBe(true);
    expect(isMissingActionRelation(new Error('relation "career_atlas_marks" does not exist'))).toBe(false);
    expect(isMissingActionRelation(new Error("connection reset"))).toBe(false);
  });

  it("walks drizzle Failed-query wrappers to the cause", () => {
    const wrapped = new Error('Failed query: select * from "action_plans"');
    wrapped.cause = new Error('relation "action_plans" does not exist');
    expect(isMissingActionRelation(wrapped)).toBe(true);

    const other = new Error('Failed query: select * from "action_plans"');
    other.cause = new Error("connection reset by peer");
    expect(isMissingActionRelation(other)).toBe(false);
  });
});
