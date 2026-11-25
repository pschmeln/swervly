import { ClerkAPIResponseError } from "@clerk/nextjs/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  captured: [] as { sql: string; params: unknown[] }[],
  emailRow: null as null | [string, string],
  getUser: vi.fn(),
  report: vi.fn(),
}));

vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  const db = drizzle(async (sql, params) => {
    state.captured.push({ sql, params });
    if (sql.startsWith("select")) return { rows: state.emailRow ? [state.emailRow] : [] };
    return { rows: [] };
  });
  // The Neon driver's batch runs the queries together; here they run in order.
  const batch = async (queries: readonly PromiseLike<unknown>[]) => {
    for (const query of queries) await query;
  };
  return { db: Object.assign(db, { batch }) };
});
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => ({ users: { getUser: state.getUser } }) }));
vi.mock("@/lib/sentry", () => ({ reportFailure: state.report }));

import { reclaimOrphanedEmail } from "@/lib/orphan-account";

const EMAIL = "student@mail.uc.edu";
const OLD_ID = "00000000-0000-4000-8000-0000000000aa";

function clerkNotFound() {
  return new ClerkAPIResponseError("Not Found", { data: [], status: 404 });
}

beforeEach(() => {
  state.captured.length = 0;
  state.emailRow = [OLD_ID, "user_old"];
  state.getUser.mockReset();
  state.report.mockReset();
});

const writes = () => state.captured.filter((query) => !query.sql.startsWith("select"));

describe("reclaimOrphanedEmail", () => {
  it("removes the row when Clerk says its sign-in no longer exists", async () => {
    state.getUser.mockRejectedValue(clerkNotFound());
    await expect(reclaimOrphanedEmail(EMAIL, "user_new")).resolves.toBe(true);
    expect(state.getUser).toHaveBeenCalledWith("user_old");
    const deleteUser = writes().find((query) => query.sql.startsWith('delete from "users"'));
    expect(deleteUser?.params).toEqual([OLD_ID, "user_old", EMAIL]);
    // Logs the row id only, never the email.
    expect(state.report).toHaveBeenCalledWith("orphaned_account_removed", OLD_ID);
    expect(JSON.stringify(state.report.mock.calls)).not.toContain("@");
  });

  it("keeps the row when the old sign-in still exists (a real conflict)", async () => {
    state.getUser.mockResolvedValue({ id: "user_old" });
    await expect(reclaimOrphanedEmail(EMAIL, "user_new")).resolves.toBe(false);
    expect(writes()).toEqual([]);
  });

  it("keeps the row when Clerk fails for any other reason", async () => {
    state.getUser.mockRejectedValue(new ClerkAPIResponseError("Server error", { data: [], status: 500 }));
    await expect(reclaimOrphanedEmail(EMAIL, "user_new")).resolves.toBe(false);
    state.getUser.mockRejectedValue(new Error("network"));
    await expect(reclaimOrphanedEmail(EMAIL, "user_new")).resolves.toBe(false);
    expect(writes()).toEqual([]);
  });

  it("does nothing when no row has the email, or the row is already this sign-in's", async () => {
    state.emailRow = null;
    await expect(reclaimOrphanedEmail(EMAIL, "user_new")).resolves.toBe(false);
    state.emailRow = [OLD_ID, "user_new"];
    await expect(reclaimOrphanedEmail(EMAIL, "user_new")).resolves.toBe(false);
    expect(state.getUser).not.toHaveBeenCalled();
    expect(writes()).toEqual([]);
  });
});
