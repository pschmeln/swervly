import { describe, expect, it } from "vitest";

import type { Employer } from "@/db/schema";
import { ApiError } from "@/lib/api";
import {
  employerUsableByUser,
  resolveExistingEmployerForUser,
} from "@/features/review/server";

function makeEmployer(overrides: Partial<Employer>): Employer {
  return {
    id: "employer-1",
    name: "Acme Robotics",
    normalizedName: "acme robotics",
    aliases: [],
    industry: null,
    city: null,
    status: "pending",
    createdByUserId: "user-a",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("employerUsableByUser", () => {
  it("allows approved employers for any user", () => {
    const approved = makeEmployer({
      status: "approved",
      createdByUserId: "user-a",
    });
    expect(employerUsableByUser(approved, "user-b")).toBe(true);
    expect(employerUsableByUser(approved, "user-a")).toBe(true);
  });

  it("allows the creating user to use their own pending employer", () => {
    const pending = makeEmployer({
      status: "pending",
      createdByUserId: "user-a",
    });
    expect(employerUsableByUser(pending, "user-a")).toBe(true);
  });

  it("rejects another user's pending employer", () => {
    const pending = makeEmployer({
      status: "pending",
      createdByUserId: "user-a",
    });
    expect(employerUsableByUser(pending, "user-b")).toBe(false);
  });

  it("rejects pending employers with no creator", () => {
    const pending = makeEmployer({
      status: "pending",
      createdByUserId: null,
    });
    expect(employerUsableByUser(pending, "user-a")).toBe(false);
  });
});

describe("resolveExistingEmployerForUser", () => {
  it("returns approved and own-pending employers", () => {
    const approved = makeEmployer({
      status: "approved",
      createdByUserId: "user-a",
    });
    const ownPending = makeEmployer({
      status: "pending",
      createdByUserId: "user-b",
    });

    expect(resolveExistingEmployerForUser(approved, "user-b")).toBe(approved);
    expect(resolveExistingEmployerForUser(ownPending, "user-b")).toBe(ownPending);
  });

  it("throws a non-leaking 409 for another user's pending", () => {
    const otherPending = makeEmployer({
      id: "secret-employer-id",
      name: "Secret Co",
      status: "pending",
      createdByUserId: "user-a",
    });

    try {
      resolveExistingEmployerForUser(otherPending, "user-b");
      expect.unreachable("expected ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      const apiError = error as ApiError;
      expect(apiError.status).toBe(409);
      expect(apiError.code).toBe("employer_name_unavailable");
      expect(apiError.message).not.toMatch(/user|pending|secret/i);
      expect(JSON.stringify(apiError.fields ?? {})).not.toMatch(
        /secret-employer-id|user-a|Secret Co/i,
      );
    }
  });
});
