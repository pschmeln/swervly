import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/direction/dismiss/route";
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
    communityTermsVersion: null,
    communityTermsAt: null,
    onboardedAt: createdAt,
    school: "mail.uc.edu",
    invitedByUserId: null,
    referralCode: "0123456789abcdef0123456789abcdef",
    shareFreeTextDefault: false,
    source: "early",
    createdAt,
    updatedAt: createdAt,
  };
}

describe("dismiss career suggestion authorization", () => {
  beforeEach(() => {
    resetMemory();
    seedMemory("users", [
      userRow(ids.userA, "user_a", "a.student@mail.uc.edu"),
      userRow(ids.userB, "user_b", "b.student@mail.uc.edu"),
    ]);
    auth.mockResolvedValue({ userId: "user_b" });
  });

  it("updates only the signed-in student", async () => {
    const response = await POST(
      new Request("http://localhost/api/direction/dismiss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleType: "healthcare_clinical" }),
      }),
      { params: Promise.resolve({}) },
    );
    expect(response.status).toBe(200);
    const users = memoryUsers();
    const userA = users.find((row) => row.id === ids.userA);
    const userB = users.find((row) => row.id === ids.userB);
    expect(userA?.dismissedCareerRoles).toEqual([]);
    expect(userB?.dismissedCareerRoles).toEqual(["healthcare_clinical"]);
  });
});
