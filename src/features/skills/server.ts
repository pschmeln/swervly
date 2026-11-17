import { and, eq, or } from "drizzle-orm";
import { SKILL_CATALOG } from "@/content/skills";
import { db } from "@/db";
import { reviews, rotations, skills, users } from "@/db/schema";
import { employerIsVisible } from "@/features/company/server";
import type { SkillCreateInput } from "@/features/review/schemas";
import { normalizeSkillName, orderSkills, type SkillChoice } from "@/features/skills/rank";
import { ApiError } from "@/lib/api";

function starterChoices(): SkillChoice[] {
  return SKILL_CATALOG.map((skill) => ({
    name: skill.name,
    kind: skill.kind,
    status: "approved",
  }));
}

export async function listSkillChoices(
  userId: string,
  employerId: string | null,
  major: string | null,
): Promise<SkillChoice[]> {
  const custom = await db
    .select()
    .from(skills)
    .where(
      or(
        eq(skills.status, "approved"),
        and(eq(skills.status, "pending"), eq(skills.createdByUserId, userId)),
      ),
    );

  const starterNames = new Set<string>(SKILL_CATALOG.map((skill) => skill.name));
  const choices: SkillChoice[] = [
    ...starterChoices(),
    ...custom
      .filter((row) => !starterNames.has(row.name))
      .filter((row) => row.kind === "technical" || row.kind === "non_technical")
      .map((row) => ({
        name: row.name,
        kind: row.kind as SkillChoice["kind"],
        status: row.status === "pending" ? "pending" as const : "approved" as const,
      })),
  ];

  const counts: Record<string, number> = {};
  if (employerId && major && (await employerIsVisible(userId, employerId))) {
    const rows = await db
      .select({ skillsUsed: reviews.skillsUsed })
      .from(reviews)
      .innerJoin(rotations, eq(reviews.rotationId, rotations.id))
      .innerJoin(users, eq(rotations.userId, users.id))
      .where(and(eq(rotations.employerId, employerId), eq(users.major, major)));
    for (const row of rows) {
      for (const name of row.skillsUsed) {
        counts[name] = (counts[name] ?? 0) + 1;
      }
    }
  }

  return orderSkills(choices, counts);
}

export async function createSkill(userId: string, input: SkillCreateInput) {
  const normalized = normalizeSkillName(input.name);
  if (!normalized) {
    throw new ApiError(400, "invalid_body", "Check the fields below and try again.", {
      name: "Enter a skill (2–60 characters).",
    });
  }

  const starter = SKILL_CATALOG.find((skill) => normalizeSkillName(skill.name) === normalized);
  if (starter) {
    return { name: starter.name, kind: starter.kind, status: "approved" as const, created: false };
  }

  const [existing] = await db
    .select()
    .from(skills)
    .where(eq(skills.normalizedName, normalized))
    .limit(1);

  if (existing) {
    const usable =
      existing.status === "approved" ||
      (existing.status === "pending" && existing.createdByUserId === userId);
    if (!usable || (existing.kind !== "technical" && existing.kind !== "non_technical")) {
      throw new ApiError(409, "skill_unavailable", "That skill isn't available yet.", {
        name: "That skill isn't available yet.",
      });
    }
    return {
      name: existing.name,
      kind: existing.kind,
      status: existing.status === "pending" ? "pending" as const : "approved" as const,
      created: false,
    };
  }

  try {
    const [created] = await db
      .insert(skills)
      .values({
        id: crypto.randomUUID(),
        name: input.name.trim(),
        normalizedName: normalized,
        kind: input.kind,
        status: "pending",
        createdByUserId: userId,
      })
      .returning();
    if (!created) throw new ApiError(500, "internal_error", "Something went wrong.");
    return { name: created.name, kind: input.kind, status: "pending" as const, created: true };
  } catch (error) {
    const raced = await db
      .select()
      .from(skills)
      .where(eq(skills.normalizedName, normalized))
      .limit(1);
    if (raced[0]?.status === "approved" || raced[0]?.createdByUserId === userId) {
      return {
        name: raced[0].name,
        kind: input.kind,
        status: raced[0].status === "pending" ? "pending" as const : "approved" as const,
        created: false,
      };
    }
    if (raced[0]) {
      throw new ApiError(409, "skill_unavailable", "That skill isn't available yet.", {
        name: "That skill isn't available yet.",
      });
    }
    throw error;
  }
}
