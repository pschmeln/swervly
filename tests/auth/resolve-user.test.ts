import { DrizzleQueryError } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/db/schema";
import { apiUser, requireUser, resolveUser } from "@/lib/auth";
import { EMAIL_CONFLICT_MESSAGE, ROUTES } from "@/lib/constants";

const mocks = vi.hoisted(() => ({
  currentUser: vi.fn(),
  insert: vi.fn(),
  selectLimit: vi.fn(),
  redirect: vi.fn((url: string): never => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  unstable_rethrow: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  currentUser: mocks.currentUser,
}));

vi.mock("@clerk/nextjs/errors", () => ({
  isClerkAPIResponseError: () => false,
}));

vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: (values: { clerkId: string; email: string }) => ({
        onConflictDoNothing: (config?: unknown) => mocks.insert(values, config),
      }),
    }),
    select: () => ({
      from: () => ({
        where: (condition: unknown) => ({
          limit: () => mocks.selectLimit(condition),
        }),
      }),
    }),
  },
}));

const clerkId = "user_new";
const email = "student@mail.uc.edu";

function userRow(overrides: Pick<User, "clerkId" | "email"> & Partial<User>): User {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    major: null,
    year: null,
    coopTrack: null,
    consentPrivacyAt: null,
    consentDataUseAt: null,
    onboardedAt: null,
    source: "early",
    createdAt: new Date("2026-11-15T00:00:00.000Z"),
    updatedAt: new Date("2026-11-15T00:00:00.000Z"),
    ...overrides,
  };
}

function uniqueViolation(constraint: string): DrizzleQueryError {
  const cause = new Error(`duplicate key value violates unique constraint "${constraint}"`);
  Object.assign(cause, { code: "23505", constraint });
  return new DrizzleQueryError(
    'insert into "users" ("clerk_id", "email") values ($1, $2) on conflict do nothing',
    [clerkId, email],
    cause,
  );
}

function clerkIdFromLookup(condition: unknown): string | undefined {
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
  if (!columns.includes("clerk_id") || columns.includes("email")) return undefined;
  return params[0];
}

function signIn(id = clerkId, address = "Student@mail.uc.edu") {
  mocks.currentUser.mockResolvedValue({
    id,
    primaryEmailAddress: { emailAddress: address },
  });
}

describe("apiUser first sign-in", () => {
  const rows = new Map<string, User>();

  beforeEach(() => {
    rows.clear();
    mocks.currentUser.mockReset();
    mocks.insert.mockReset();
    mocks.selectLimit.mockReset();
    mocks.redirect.mockClear();
    signIn();
    mocks.selectLimit.mockImplementation(async (condition: unknown) => {
      const id = clerkIdFromLookup(condition);
      if (!id) return [...rows.values()];
      const row = rows.get(id);
      return row ? [row] : [];
    });
  });

  it("returns the new row when a concurrent insert loses on users_email_unique", async () => {
    const row = userRow({ clerkId, email });
    let attempts = 0;
    mocks.insert.mockImplementation(async (values: { clerkId: string; email: string }, config?: unknown) => {
      expect(config).toBeUndefined();
      expect(values).toEqual({ clerkId, email });
      attempts += 1;
      if (attempts === 1) {
        rows.set(values.clerkId, row);
        await new Promise((resolve) => setTimeout(resolve, 20));
        return;
      }
      throw uniqueViolation("users_email_unique");
    });

    const [first, second] = await Promise.all([apiUser(), apiUser()]);

    expect(attempts).toBe(2);
    expect(first).toEqual(row);
    expect(second).toEqual(row);
    expect(rows.size).toBe(1);
  });

  it("returns the existing row when the insert is skipped", async () => {
    const row = userRow({ clerkId, email, onboardedAt: new Date("2026-11-15T12:00:00.000Z") });
    rows.set(clerkId, row);
    mocks.insert.mockResolvedValue(undefined);

    await expect(apiUser()).resolves.toEqual(row);
    expect(mocks.insert).toHaveBeenCalledOnce();
  });

  it("returns email_conflict and does not adopt a row owned by another clerk id", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const existing = userRow({
      id: "00000000-0000-4000-8000-000000000002",
      clerkId: "user_existing",
      email,
    });
    rows.set(existing.clerkId, existing);
    mocks.insert.mockRejectedValue(uniqueViolation("users_email_unique"));

    await expect(resolveUser()).resolves.toEqual({ status: "email_conflict" });
    await expect(requireUser()).rejects.toThrow(`NEXT_REDIRECT:${ROUTES.accountConflict}`);
    expect(mocks.redirect).toHaveBeenCalledWith(ROUTES.accountConflict);
    await expect(apiUser()).rejects.toMatchObject({
      status: 409,
      code: "email_conflict",
      message: EMAIL_CONFLICT_MESSAGE,
    });

    const logged = errorSpy.mock.calls.map((call) => call.map(String).join(" ")).join("\n");
    expect(errorSpy).toHaveBeenCalledWith("user_email_conflict", "email_owned_by_other_clerk");
    expect(logged).not.toContain("@");
    expect(logged).not.toContain(email);
    expect(logged).not.toContain("User row missing after insert.");
    expect(rows.get("user_existing")).toEqual(existing);
    expect(rows.has(clerkId)).toBe(false);
    errorSpy.mockRestore();
  });

  it("returns email_conflict when the email conflict is ignored", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const existing = userRow({
      id: "00000000-0000-4000-8000-000000000002",
      clerkId: "user_existing",
      email,
    });
    rows.set(existing.clerkId, existing);
    mocks.insert.mockResolvedValue(undefined);

    await expect(resolveUser()).resolves.toEqual({ status: "email_conflict" });
    await expect(apiUser()).rejects.toMatchObject({ status: 409, code: "email_conflict" });
    const rejection = await apiUser().then(
      () => {
        throw new Error("expected apiUser to reject");
      },
      (caught: unknown) => caught,
    );
    expect(rejection).toBeInstanceOf(Error);
    expect((rejection as Error).message).toBe(EMAIL_CONFLICT_MESSAGE);
    expect((rejection as Error).message).not.toContain("@");
    expect(errorSpy).toHaveBeenCalledWith("user_email_conflict", "email_owned_by_other_clerk");
    expect(rows.get("user_existing")).toEqual(existing);
    expect(rows.has(clerkId)).toBe(false);
    errorSpy.mockRestore();
  });

  it("reports a Clerk auth failure and still throws", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new Error("Clerk: Missing secretKey.");
    mocks.currentUser.mockRejectedValue(failure);

    await expect(apiUser()).rejects.toBe(failure);
    expect(errorSpy).toHaveBeenCalledWith("clerk_auth_failed", "missing_secret_key");
    expect(mocks.insert).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("rethrows errors that are not unique violations", async () => {
    const failure = new Error("connection refused");
    mocks.insert.mockRejectedValue(failure);

    await expect(apiUser()).rejects.toBe(failure);
    expect(mocks.selectLimit).not.toHaveBeenCalled();
  });

  it("creates a user for a .edu address outside the extra allowlist", async () => {
    const purdue = "student@purdue.edu";
    const row = userRow({ clerkId, email: purdue });
    signIn(clerkId, "Student@Purdue.EDU");
    mocks.insert.mockImplementation(async (values: { clerkId: string; email: string }) => {
      expect(values.email).toBe(purdue);
      rows.set(values.clerkId, row);
    });

    await expect(apiUser()).resolves.toEqual(row);
  });

  it("does not insert a row when .edu is not the domain suffix", async () => {
    signIn(clerkId, "person@x.edu.evil.com");
    await expect(apiUser()).rejects.toMatchObject({ status: 403, code: "not_eligible" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("does not insert a row for a signed-out or non-university session", async () => {
    mocks.currentUser.mockResolvedValue(null);
    await expect(apiUser()).rejects.toMatchObject({ status: 401, code: "unauthorized" });

    signIn(clerkId, "person@gmail.com");
    await expect(apiUser()).rejects.toMatchObject({ status: 403, code: "not_eligible" });
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});
