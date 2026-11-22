import { ClerkAPIResponseError } from "@clerk/nextjs/errors";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "@/app/api/account/route";
import { users, type User } from "@/db/schema";
import { deleteAccount } from "@/features/profile/server";
import { readApiResponse } from "@/features/profile/components/api";
import { ApiError } from "@/lib/api";

const CLERK_FAILURE_MESSAGE =
  "We could not delete your sign-in account, so nothing was removed. Please try again, or email support@swervly.com.";
const MISSING_CLERK_ID_MESSAGE =
  "We could not delete your account. Nothing was removed. Email support@swervly.com and we will do it for you.";
const INCOMPLETE_MESSAGE =
  "Your sign-in account was deleted, but some of your data may remain. Email support@swervly.com and we will remove the rest.";

const mocks = vi.hoisted(() => ({
  apiUser: vi.fn(),
  clerkClient: vi.fn(),
  deleteUser: vi.fn(),
  dbDelete: vi.fn(),
  deleteWhere: vi.fn(),
  events: [] as string[],
}));

vi.mock("@/lib/auth", () => ({
  apiUser: mocks.apiUser,
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: mocks.clerkClient,
}));

vi.mock("@/db", () => {
  const tableName = (table: unknown) => (table as Record<symbol, unknown>)[Symbol.for("drizzle:Name")];
  return {
    db: {
      // Community clean-up (D11) runs in the same batch, before the users row; it is not what these tests check.
      execute: () => Promise.resolve(),
      select: () => ({ from: () => ({ where: () => ({}) }) }),
      update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
      batch: async (queries: readonly unknown[]) => {
        for (const query of queries) await query;
      },
      delete: (table: unknown) => {
        if (tableName(table) !== "users") return { where: () => Promise.resolve() };
        mocks.events.push("rows");
        mocks.dbDelete(table);
        return {
          where: (condition: unknown) => mocks.deleteWhere(condition),
        };
      },
    },
  };
});

const userId = "00000000-0000-4000-8000-000000000001";
const clerkId = "user_test";

function userRow(overrides: Partial<User> = {}): User {
  return {
    id: userId,
    clerkId,
    email: "student@mail.uc.edu",
    major: null,
    year: null,
    coopTrack: null,
    consentPrivacyAt: null,
    consentDataUseAt: null,
    shareReviewsConsentAt: null,
    shareReviewsConsentVersion: null,
    privacyPolicyVersion: null,
    communityTermsVersion: null,
    communityTermsAt: null,
    onboardedAt: null,
    school: null,
    invitedByUserId: null,
    shareFreeTextDefault: false,
    majorSource: null,
    customMajorText: null,
    majorSubmissionId: null,
    exploringMajors: false,
    dismissedCareerRoles: [],
    interestedCareerRoles: [],
    source: "early",
    createdAt: new Date("2026-11-15T00:00:00.000Z"),
    updatedAt: new Date("2026-11-15T00:00:00.000Z"),
    ...overrides,
  };
}

function clerkError(status: number, code: string): ClerkAPIResponseError {
  return new ClerkAPIResponseError("clerk request failed", {
    status,
    data: [{ code, message: "clerk request failed" }],
  });
}

function whereTargetsUser(condition: unknown, id: string): boolean {
  const columns: string[] = [];
  const params: string[] = [];
  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    const record = node as Record<string, unknown>;
    if (typeof record.name === "string" && typeof record.columnType === "string") {
      columns.push(record.name);
    }
    if (typeof record.value === "string" && "encoder" in record) params.push(record.value);
    if (Array.isArray(record.queryChunks)) visit(record.queryChunks);
  };
  visit(condition);
  return columns.includes("id") && !columns.includes("email") && params.includes(id);
}

function deleteRequest(): Request {
  return new Request("http://localhost/api/account", {
    method: "DELETE",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ confirm: "DELETE" }),
  });
}

describe("deleteAccount", () => {
  beforeEach(() => {
    mocks.events.length = 0;
    mocks.apiUser.mockReset();
    mocks.clerkClient.mockReset();
    mocks.deleteUser.mockReset();
    mocks.dbDelete.mockReset();
    mocks.deleteWhere.mockReset();
    mocks.clerkClient.mockImplementation(async () => ({
      users: { deleteUser: mocks.deleteUser },
    }));
    mocks.deleteUser.mockImplementation(async () => {
      mocks.events.push("clerk");
    });
    mocks.deleteWhere.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("deletes the Clerk user before the rows", async () => {
    const user = userRow();

    await expect(deleteAccount(user)).resolves.toBeUndefined();

    expect(mocks.events).toEqual(["clerk", "rows"]);
    expect(mocks.deleteUser).toHaveBeenCalledWith(clerkId);
    expect(mocks.dbDelete).toHaveBeenCalledWith(users);
    expect(whereTargetsUser(mocks.deleteWhere.mock.calls[0]?.[0], userId)).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("throws and does not delete rows when Clerk fails", async () => {
    mocks.deleteUser.mockRejectedValue(clerkError(500, "internal_error"));

    await expect(deleteAccount(userRow())).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      code: "delete_failed",
      message: CLERK_FAILURE_MESSAGE,
    });

    expect(mocks.dbDelete).not.toHaveBeenCalled();
    expect(mocks.deleteWhere).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("clerk_delete_failed", "internal_error");
  });

  it("does not treat a non-Clerk 404 as an already-deleted sign-in", async () => {
    mocks.deleteUser.mockRejectedValue(Object.assign(new Error("down"), { status: 404 }));

    const error = await deleteAccount(userRow()).then(
      () => {
        throw new Error("expected deleteAccount to reject");
      },
      (caught: unknown) => caught,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 502,
      code: "delete_failed",
      message: CLERK_FAILURE_MESSAGE,
    });

    expect(mocks.dbDelete).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("clerk_delete_failed", "unknown");
  });

  it("treats a Clerk 404 as success and still deletes the rows", async () => {
    mocks.deleteUser.mockImplementation(async () => {
      mocks.events.push("clerk");
      throw clerkError(404, "resource_not_found");
    });

    await expect(deleteAccount(userRow())).resolves.toBeUndefined();

    expect(mocks.events).toEqual(["clerk", "rows"]);
    expect(mocks.dbDelete).toHaveBeenCalledWith(users);
    expect(whereTargetsUser(mocks.deleteWhere.mock.calls[0]?.[0], userId)).toBe(true);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("throws delete_incomplete when the row delete fails after Clerk succeeds", async () => {
    mocks.deleteWhere.mockRejectedValue(new Error("connection refused"));

    await expect(deleteAccount(userRow())).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      code: "delete_incomplete",
      message: INCOMPLETE_MESSAGE,
    });

    expect(mocks.events).toEqual(["clerk", "rows"]);
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith("account_rows_delete_failed", userId);
  });

  it("deletes nothing when the Clerk id is missing", async () => {
    await expect(deleteAccount(userRow({ clerkId: "" }))).rejects.toMatchObject({
      name: "ApiError",
      status: 500,
      code: "delete_failed",
      message: MISSING_CLERK_ID_MESSAGE,
    });

    expect(mocks.clerkClient).not.toHaveBeenCalled();
    expect(mocks.dbDelete).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith("clerk_delete_failed", "missing_clerk_id");
  });

  it("returns the Clerk failure from DELETE /api/account for the settings form", async () => {
    const user = userRow();
    mocks.apiUser.mockResolvedValue(user);
    mocks.deleteUser.mockRejectedValue(clerkError(500, "internal_error"));

    const response = await DELETE(deleteRequest(), {
      params: Promise.resolve({}),
    });
    const parsed = readApiResponse<unknown>(await response.json());

    expect(response.status).toBe(502);
    expect(parsed).toEqual({
      ok: false,
      error: { code: "delete_failed", message: CLERK_FAILURE_MESSAGE },
    });
    expect(mocks.dbDelete).not.toHaveBeenCalled();
  });
});
