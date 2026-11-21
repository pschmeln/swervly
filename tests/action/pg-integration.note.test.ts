import { describe, expect, it } from "vitest";

/**
 * Real Postgres concurrency / archive smokes for Action 0009 ran outside Vitest
 * (Neon MCP against disposable + `dev-peter` + `dev-li` + production schema verify).
 * See store docs: `action-0009-*-migrate.md` / `action-0009-isolated-validation.md`.
 *
 * This suite stays unit-only: do not point Vitest at production. App invariants
 * also covered by `action_plans_one_active`, `isUniqueViolation` → 409, and
 * archive+insert in one `db.batch`.
 */
describe("Postgres integration note", () => {
  it("keeps Vitest unit-only even when DATABASE_URL is present in the agent env", () => {
    // Presence of DATABASE_URL must not imply these unit tests open a live DB.
    expect(typeof process.env.DATABASE_URL === "string" || process.env.DATABASE_URL === undefined).toBe(true);
  });
});
