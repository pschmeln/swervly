import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";

const databaseUrl = process.env.PHASE2_TEST_DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb("phase 2 postgres consistency", () => {
  let db: typeof import("@/db").db;
  let saveProfile: typeof import("@/features/profile/server").saveProfile;
  let listSkillChoices: typeof import("@/features/skills/server").listSkillChoices;
  const createdUsers: string[] = [];
  const createdEmployers: string[] = [];

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.FOUNDER_EMAILS = "founder@example.edu";
    db = (await import("@/db")).db;
    saveProfile = (await import("@/features/profile/server")).saveProfile;
    listSkillChoices = (await import("@/features/skills/server")).listSkillChoices;
  });

  afterAll(async () => {
    if (!db) return;
    const { employers, users } = await import("@/db/schema");
    await db.execute(sql`drop trigger if exists phase2_skip_conflict on major_submissions`);
    await db.execute(sql`drop function if exists phase2_skip_conflict()`);
    if (createdUsers.length > 0) {
      await db.delete(users).where(inArray(users.id, createdUsers));
    }
    if (createdEmployers.length > 0) {
      await db.delete(employers).where(inArray(employers.id, createdEmployers));
    }
  });

  function profileBody(goal: "industry" | "grad_school", customName: string) {
    return {
      school: "Fixture University",
      year: 3,
      goal,
      locationConstraint: "anywhere" as const,
      consentPrivacy: true as const,
      consentDataUse: true as const,
      majorSelection: { source: "custom" as const, name: customName },
    };
  }

  async function makeUser(): Promise<string> {
    const { users } = await import("@/db/schema");
    const id = randomUUID();
    createdUsers.push(id);
    await db.insert(users).values({
      id,
      clerkId: `phase2-pg-${id}`,
      email: `phase2-pg-${id}@example.edu`,
      source: "early",
    });
    return id;
  }

  it("does not change the profile when the pending submission update matches nothing", async () => {
    const { profiles, majorSubmissions, users } = await import("@/db/schema");
    const userId = await makeUser();
    await db.insert(profiles).values({
      userId,
      goal: "industry",
      locationConstraint: "anywhere",
    });
    const submissionId = randomUUID();
    await db.insert(majorSubmissions).values({
      id: submissionId,
      userId,
      rawName: "Alpha",
      normalizedName: "alpha",
      status: "pending",
    });
    await db.update(users).set({
      major: "Alpha",
      majorSource: "custom",
      customMajorText: "Alpha",
      majorSubmissionId: submissionId,
    }).where(eq(users.id, userId));
    await db.execute(sql`
      create or replace function phase2_skip_conflict() returns trigger as $fn$
      begin
        if new.raw_name like 'conflict-%' then
          return null;
        end if;
        return new;
      end
      $fn$ language plpgsql
    `);
    await db.execute(sql`
      drop trigger if exists phase2_skip_conflict on major_submissions
    `);
    await db.execute(sql`
      create trigger phase2_skip_conflict
      before update on major_submissions
      for each row execute function phase2_skip_conflict()
    `);
    await expect(saveProfile(userId, profileBody("grad_school", "conflict-name"))).rejects.toMatchObject({
      status: 409,
    });
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    const [submission] = await db.select().from(majorSubmissions).where(eq(majorSubmissions.id, submissionId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(profile?.goal).toBe("industry");
    expect(submission?.rawName).toBe("Alpha");
    expect(submission?.status).toBe("pending");
    expect(user?.majorSource).toBe("custom");
    expect(user?.customMajorText).toBe("Alpha");
    await db.execute(sql`drop trigger if exists phase2_skip_conflict on major_submissions`);
    await db.execute(sql`drop function if exists phase2_skip_conflict()`);
  });

  it("keeps a single pending submission when two custom saves race", async () => {
    const { majorSubmissions, profiles } = await import("@/db/schema");
    const userId = await makeUser();
    const results = await Promise.allSettled([
      saveProfile(userId, profileBody("industry", "First Custom Major")),
      saveProfile(userId, profileBody("grad_school", "Second Custom Major")),
    ]);
    const { users } = await import("@/db/schema");
    const pending = await db.select().from(majorSubmissions).where(eq(majorSubmissions.userId, userId));
    const open = pending.filter((row) => row.status === "pending");
    expect(open).toHaveLength(1);
    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.reason).toMatchObject({ status: 409 });
      }
    }
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(user?.major).toBeNull();
    expect(user?.majorSource).toBe("custom");
    expect(user?.majorSubmissionId).toBe(open[0]?.id);
    expect(user?.customMajorText).toBe(open[0]?.rawName);
    expect(profile?.goal).toBe(open[0]?.rawName === "First Custom Major" ? "industry" : "grad_school");
  });

  it("rejects a second pending submission for the same user", async () => {
    const { majorSubmissions } = await import("@/db/schema");
    const userId = await makeUser();
    await saveProfile(userId, profileBody("industry", "Only Pending Major"));
    await expect(db.insert(majorSubmissions).values({
      id: randomUUID(),
      userId,
      rawName: "Extra Pending Major",
      normalizedName: "extra pending major",
      status: "pending",
    })).rejects.toThrow();
    const pending = await db.select().from(majorSubmissions).where(eq(majorSubmissions.userId, userId));
    expect(pending.filter((row) => row.status === "pending")).toHaveLength(1);
  });

  it("keeps the student catalog save when a founder approval races it", async () => {
    const { majorSubmissions, profiles, users } = await import("@/db/schema");
    const userId = await makeUser();
    await saveProfile(userId, profileBody("industry", "Race Studies"));
    const [pending] = await db
      .select()
      .from(majorSubmissions)
      .where(eq(majorSubmissions.userId, userId));
    expect(pending?.status).toBe("pending");
    const { moderateMajor } = await import("@/features/majors/moderate");
    const [student, founder] = await Promise.all([
      saveProfile(userId, {
        school: "Fixture University",
        year: 3,
        goal: "grad_school",
        locationConstraint: "anywhere",
        consentPrivacy: true,
        consentDataUse: true,
        majorSelection: { source: "catalog", name: "Biology" },
      }),
      moderateMajor("founder@example.edu", {
        action: "approve",
        kind: "major",
        id: pending!.id,
      }),
    ]);
    expect(student.profile.goal).toBe("grad_school");
    expect(founder.id).toBe(pending?.id);
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId));
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const [submission] = await db.select().from(majorSubmissions).where(eq(majorSubmissions.id, pending!.id));
    expect(user?.major).toBe("Biology");
    expect(user?.majorSource).toBe("catalog");
    expect(user?.majorSubmissionId).toBeNull();
    expect(user?.customMajorText).toBeNull();
    expect(profile?.goal).toBe("grad_school");
    expect(submission?.status).toBe("approved");
  });

  it("does not rank skills from unconsented or custom-major reviews", async () => {
    const { employers, reviews, rotations, users } = await import("@/db/schema");
    const viewer = await makeUser();
    await db.update(users).set({ major: "Nursing", majorSource: "catalog" }).where(eq(users.id, viewer));
    const hidden = await makeUser();
    const consented = await makeUser();
    const employerId = randomUUID();
    createdEmployers.push(employerId);
    await db.insert(employers).values({
      id: employerId,
      name: `Fixture Employer ${employerId}`,
      normalizedName: `fixture employer ${employerId}`,
      status: "approved",
    });
    async function addReview(userId: string, skill: string, consent: boolean, source: "catalog" | "custom") {
      const rotationId = randomUUID();
      await db.insert(rotations).values({
        id: rotationId,
        userId,
        employerId,
        roleTitle: "Fixture",
        roleType: "other",
        termSeason: "fall",
        termYear: 2024,
        rotationNumber: 1,
        wouldReturn: "yes",
        source: "early",
      });
      await db.insert(reviews).values({
        id: randomUUID(),
        rotationId,
        enjoyment: 4,
        learning: 4,
        mentorship: 4,
        clarityGained: 4,
        skillsUsed: [skill],
        shareFreeText: false,
        source: "early",
      });
      await db.update(users).set({
        major: "Nursing",
        majorSource: source,
        customMajorText: source === "custom" ? "Nursing" : null,
        shareReviewsConsentAt: consent ? new Date("2026-03-01T00:00:00.000Z") : null,
        shareReviewsConsentVersion: consent ? 1 : null,
      }).where(eq(users.id, userId));
    }
    await addReview(hidden, "Programming", false, "catalog");
    await addReview(consented, "Field work", true, "catalog");
    const customUser = await makeUser();
    await addReview(customUser, "Project management", true, "custom");
    const choices = await listSkillChoices(viewer, employerId, "Nursing");
    expect(choices[0]?.name).toBe("Field work");
  });
});
