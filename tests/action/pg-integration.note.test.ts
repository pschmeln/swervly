import { describe, expect, it } from "vitest";

/**
 * Real Postgres concurrency checks (two concurrent seeds against a throwaway
 * Neon branch with 0009 applied) need DATABASE_URL. This environment has none,
 * so Stage C corrections rely on:
 * - partial unique index `action_plans_one_active` in 0009 SQL
 * - isUniqueViolation → HTTP 409 in seedActivePlan / changePlanGoal
 * - archive+insert in one db.batch for goal change
 *
 * When Allen approves migrate on an isolated branch, run manually:
 *   two parallel POSTs /api/action/plan → exactly one 200 and one 409;
 *   goal change leaves prior plan status=archived with tasks unchanged.
 */
describe("Postgres integration availability", () => {
  it("documents that isolated PG was unavailable in this agent environment", () => {
    expect(Boolean(process.env.DATABASE_URL)).toBe(false);
  });
});
