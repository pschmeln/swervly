import { beforeEach, describe, expect, it, vi } from "vitest";

import { PUT, DELETE } from "@/app/api/rotations/[id]/route";
import { GET, POST } from "@/app/api/rotations/route";
import type { User } from "@/db/schema";
import { memorySnapshot, resetMemory, seedMemory } from "./memory-db";

const currentUser = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs/server", () => ({
  currentUser,
}));

vi.mock("@/db", async () => {
  const memory = await import("./memory-db");
  return { db: memory.db };
});

const ids = {
  userA: "11111111-1111-4111-8111-111111111111",
  userB: "22222222-2222-4222-8222-222222222222",
  userC: "33333333-3333-4333-8333-333333333333",
  employer: "44444444-4444-4444-8444-444444444444",
  rotation: "55555555-5555-4555-8555-555555555555",
  review: "66666666-6666-4666-8666-666666666666",
} as const;

const clerkIds = {
  userA: "user_a",
  userB: "user_b",
  userC: "user_c",
} as const;

const emails = {
  userA: "a.student@mail.uc.edu",
  userB: "b.student@mail.uc.edu",
  userC: "c.student@mail.uc.edu",
} as const;

const createdAt = new Date("2026-03-01T00:00:00.000Z");

function userRow(id: string, clerkId: string, email: string, onboardedAt: Date | null): User {
  return {
    id,
    clerkId,
    email,
    major: "Computer Engineering",
    year: 3,
    coopTrack: null,
    consentPrivacyAt: new Date("2026-02-01T00:00:00.000Z"),
    consentDataUseAt: new Date("2026-02-01T00:00:00.000Z"),
    shareReviewsConsentAt: new Date("2026-02-01T00:00:00.000Z"),
    shareReviewsConsentVersion: 1,
    onboardedAt,
    school: "mail.uc.edu",
    invitedByUserId: null,
    shareFreeTextDefault: false,
    source: "early",
    createdAt,
    updatedAt: createdAt,
  };
}

const originalReview = {
  enjoyment: 5,
  learning: 4,
  mentorship: 3,
  clarityGained: 2,
  skillsUsed: ["Programming"],
  freeText: null,
  shareFreeText: false,
};

function seedCoop() {
  resetMemory();
  seedMemory("users", [
    userRow(ids.userA, clerkIds.userA, emails.userA, new Date("2026-02-02T00:00:00.000Z")),
    userRow(ids.userB, clerkIds.userB, emails.userB, new Date("2026-02-02T00:00:00.000Z")),
    userRow(ids.userC, clerkIds.userC, emails.userC, null),
  ]);
  seedMemory("employers", [
    {
      id: ids.employer,
      name: "Test Employer A",
      normalizedName: "test employer a",
      aliases: [],
      industry: null,
      city: "Cincinnati",
      status: "approved",
      createdByUserId: null,
      createdAt,
    },
  ]);
  seedMemory("rotations", [
    {
      id: ids.rotation,
      userId: ids.userA,
      employerId: ids.employer,
      roleTitle: "Controls Intern",
      termSeason: "fall",
      termYear: 2024,
      rotationNumber: 1,
      payHourly: "22.50",
      wouldReturn: "yes",
      roleType: "design",
      source: "early",
      createdAt,
      updatedAt: createdAt,
    },
  ]);
  seedMemory("reviews", [
    {
      id: ids.review,
      rotationId: ids.rotation,
      ...originalReview,
      source: "early",
      createdAt,
      updatedAt: createdAt,
    },
  ]);
}

function signIn(clerkId: string, email: string) {
  currentUser.mockResolvedValue({
    id: clerkId,
    primaryEmailAddress: { emailAddress: email },
  });
}

function routeContext(id?: string): {
  params: Promise<Record<string, string | string[]>>;
} {
  const params: Record<string, string | string[]> = {};
  if (id) params.id = id;
  return { params: Promise.resolve(params) };
}

function hijackBody() {
  return {
    employerId: ids.employer,
    roleTitle: "Hijacked",
    termSeason: "summer",
    termYear: 2025,
    rotationNumber: 1,
    roleType: "software",
    wouldReturn: "no",
    review: {
      enjoyment: 1,
      learning: 1,
      mentorship: 1,
      clarityGained: 1,
      skillsUsed: [],
      shareFreeText: false,
    },
  };
}

async function getRotations() {
  return GET(new Request("http://localhost/api/rotations"), routeContext());
}

async function postRotation(body: unknown) {
  return POST(
    new Request("http://localhost/api/rotations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    routeContext(),
  );
}

async function putRotation(id: string, body: unknown) {
  return PUT(
    new Request(`http://localhost/api/rotations/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    routeContext(id),
  );
}

async function deleteRotation(id: string) {
  return DELETE(
    new Request(`http://localhost/api/rotations/${id}`, { method: "DELETE" }),
    routeContext(id),
  );
}

async function expectError(response: Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({
    ok: false,
    error: {
      code,
      message: code === "not_onboarded" ? "Finish onboarding first." : "Rotation not found.",
    },
  });
}

describe("cross-user rotation authorization", () => {
  beforeEach(() => {
    currentUser.mockReset();
    seedCoop();
  });

  it("lets the owner update and delete their own rotation", async () => {
    signIn(clerkIds.userA, emails.userA);

    const updated = await putRotation(ids.rotation, {
      employerId: ids.employer,
      roleTitle: "Controls Lead",
      termSeason: "fall",
      termYear: 2024,
      rotationNumber: 1,
      payHourly: 22.5,
      roleType: "design",
      wouldReturn: "yes",
      review: {
        enjoyment: 1,
        learning: 4,
        mentorship: 3,
        clarityGained: 2,
        skillsUsed: ["Programming"],
        shareFreeText: false,
      },
    });
    expect(updated.status).toBe(200);
    const updatedBody = await updated.json();
    expect(updatedBody.ok).toBe(true);
    expect(updatedBody.data.roleTitle).toBe("Controls Lead");
    expect(updatedBody.data.review.enjoyment).toBe(1);
    expect(memorySnapshot().rotations[0]?.roleTitle).toBe("Controls Lead");
    expect(memorySnapshot().reviews[0]?.enjoyment).toBe(1);

    const removed = await deleteRotation(ids.rotation);
    expect(removed.status).toBe(200);
    expect(await removed.json()).toEqual({ ok: true, data: { id: ids.rotation } });
    expect(memorySnapshot()).toEqual({ rotations: [], reviews: [] });
  });

  it("returns only B's rotations and does not let B edit or delete A's rotation", async () => {
    const before = memorySnapshot();
    signIn(clerkIds.userA, emails.userA);

    const asOwner = await getRotations();
    expect(asOwner.status).toBe(200);
    const ownerBody = await asOwner.json();
    expect(ownerBody.ok).toBe(true);
    expect(ownerBody.data).toHaveLength(1);
    expect(ownerBody.data[0]).toMatchObject({
      id: ids.rotation,
      userId: ids.userA,
      roleTitle: "Controls Intern",
      termSeason: "fall",
      termYear: 2024,
      rotationNumber: 1,
      payHourly: "22.50",
      wouldReturn: "yes",
      roleType: "design",
      review: originalReview,
    });

    signIn(clerkIds.userB, emails.userB);
    const listed = await getRotations();
    expect(listed.status).toBe(200);
    expect(await listed.json()).toEqual({ ok: true, data: [] });

    const edited = await putRotation(ids.rotation, hijackBody());
    await expectError(edited, 404, "rotation_not_found");

    const removed = await deleteRotation(ids.rotation);
    await expectError(removed, 404, "rotation_not_found");

    expect(memorySnapshot()).toEqual(before);

    signIn(clerkIds.userA, emails.userA);
    const after = await getRotations();
    expect(after.status).toBe(200);
    const afterBody = await after.json();
    expect(afterBody.data).toHaveLength(1);
    expect(afterBody.data[0]).toMatchObject({
      id: ids.rotation,
      roleTitle: "Controls Intern",
      payHourly: "22.50",
      wouldReturn: "yes",
      roleType: "design",
      review: originalReview,
    });
  });

  it("rejects a signed-in user who has not finished onboarding", async () => {
    const before = memorySnapshot();
    signIn(clerkIds.userC, emails.userC);

    await expectError(await getRotations(), 403, "not_onboarded");
    await expectError(await postRotation(hijackBody()), 403, "not_onboarded");
    await expectError(await putRotation(ids.rotation, hijackBody()), 403, "not_onboarded");
    await expectError(await deleteRotation(ids.rotation), 403, "not_onboarded");

    expect(memorySnapshot()).toEqual(before);
  });
});
