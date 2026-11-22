import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/direction/interest/route";
import { POST as DISMISS } from "@/app/api/direction/dismiss/route";
import type { User } from "@/db/schema";
import { memoryUsers, resetMemory, seedMemory } from "../review/memory-db";

const auth = vi.hoisted(() => vi.fn());

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth,
  clerkClient: async () => {
    throw new Error("clerk backend");
  },
}));

vi.mock("@/db", async () => {
  const memory = await import("../review/memory-db");
  return { db: memory.db };
});

const ids = {
  userA: "11111111-1111-4111-8111-111111111111",
  userB: "22222222-2222-4222-8222-222222222222",
} as const;

const createdAt = new Date("2026-03-01T00:00:00.000Z");

function userRow(id: string, clerkId: string, email: string): User {
  return {
    id,
    clerkId,
    email,
    major: "Nursing",
    majorSource: "catalog",
    customMajorText: null,
    majorSubmissionId: null,
    exploringMajors: false,
    dismissedCareerRoles: [],
    interestedCareerRoles: [],
    year: 3,
    coopTrack: null,
    consentPrivacyAt: createdAt,
    consentDataUseAt: createdAt,
    shareReviewsConsentAt: null,
    shareReviewsConsentVersion: null,
    privacyPolicyVersion: null,
    onboardedAt: createdAt,
    school: "mail.uc.edu",
    invitedByUserId: null,
    shareFreeTextDefault: false,
    source: "early",
    createdAt,
    updatedAt: createdAt,
  };
}

function post(handler: typeof POST, path: string, body: unknown) {
  return handler(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({}) },
  );
}

describe("Interested on a career suggestion", () => {
  beforeEach(() => {
    resetMemory();
    seedMemory("users", [
      userRow(ids.userA, "user_a", "a.student@mail.uc.edu"),
      { ...userRow(ids.userB, "user_b", "b.student@mail.uc.edu"), dismissedCareerRoles: ["healthcare_clinical"] },
    ]);
    auth.mockResolvedValue({ userId: "user_b" });
  });

  it("saves for the signed-in student only, and undoes a dismissal", async () => {
    const response = await post(POST, "/api/direction/interest", { roleType: "healthcare_clinical", interested: true });
    expect(response.status).toBe(200);
    const users = memoryUsers();
    expect(users.find((row) => row.id === ids.userA)?.interestedCareerRoles).toEqual([]);
    const userB = users.find((row) => row.id === ids.userB);
    expect(userB?.interestedCareerRoles).toEqual(["healthcare_clinical"]);
    expect(userB?.dismissedCareerRoles).toEqual([]);
  });

  it("ignores a user id in the body", async () => {
    await post(POST, "/api/direction/interest", { roleType: "design", interested: true, userId: ids.userA });
    expect(memoryUsers().find((row) => row.id === ids.userA)?.interestedCareerRoles).toEqual([]);
  });

  it("rejects an unknown career and a missing flag", async () => {
    expect((await post(POST, "/api/direction/interest", { roleType: "not_a_role", interested: true })).status).toBe(400);
    expect((await post(POST, "/api/direction/interest", { roleType: "design" })).status).toBe(400);
  });

  it("removes Interested when the student dismisses the same career", async () => {
    await post(POST, "/api/direction/interest", { roleType: "design", interested: true });
    await post(DISMISS, "/api/direction/dismiss", { roleType: "design" });
    const userB = memoryUsers().find((row) => row.id === ids.userB);
    expect(userB?.interestedCareerRoles).toEqual([]);
    expect(userB?.dismissedCareerRoles).toContain("design");
  });
});
