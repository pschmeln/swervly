import { eq, sql } from "drizzle-orm";
import { SKILL_CATALOG } from "@/content/skills";
import { db } from "@/db";
import { employers, reviews, rotations, skills } from "@/db/schema";
import { normalizeEmployerName } from "@/features/review/normalize";
import type { ModerationInput } from "@/features/review/schemas";
import { normalizeSkillName } from "@/features/skills/rank";
import { ApiError } from "@/lib/api";

async function approvedSkillName(name: string): Promise<string | null> {
  const normalized = normalizeSkillName(name);
  const starter = SKILL_CATALOG.find((skill) => normalizeSkillName(skill.name) === normalized);
  if (starter) return starter.name;
  const [row] = await db
    .select()
    .from(skills)
    .where(eq(skills.normalizedName, normalized))
    .limit(1);
  if (!row || row.status !== "approved") return null;
  return row.name;
}

async function requirePendingSkill(id: string) {
  const [row] = await db.select().from(skills).where(eq(skills.id, id)).limit(1);
  if (!row || row.status !== "pending") {
    throw new ApiError(404, "not_found", "That item is no longer waiting.");
  }
  return row;
}

async function requirePendingEmployer(id: string) {
  const [row] = await db.select().from(employers).where(eq(employers.id, id)).limit(1);
  if (!row || row.status !== "pending") {
    throw new ApiError(404, "not_found", "That item is no longer waiting.");
  }
  return row;
}

export async function moderate(input: ModerationInput): Promise<{ id: string }> {
  if (input.action === "approve") {
    if (input.kind === "skill") {
      await requirePendingSkill(input.id);
      await db.update(skills).set({ status: "approved" }).where(eq(skills.id, input.id));
      return { id: input.id };
    }
    await requirePendingEmployer(input.id);
    await db.update(employers).set({ status: "approved" }).where(eq(employers.id, input.id));
    return { id: input.id };
  }

  if (input.action === "reject") {
    if (input.kind === "skill") {
      await requirePendingSkill(input.id);
      await db.update(skills).set({ status: "rejected" }).where(eq(skills.id, input.id));
      return { id: input.id };
    }
    await requirePendingEmployer(input.id);
    await db.update(employers).set({ status: "rejected" }).where(eq(employers.id, input.id));
    return { id: input.id };
  }

  if (input.kind === "skill") {
    const pending = await requirePendingSkill(input.id);
    const targetName = await approvedSkillName(input.intoName ?? "");
    if (!targetName || normalizeSkillName(targetName) === pending.normalizedName) {
      throw new ApiError(404, "not_found", "Choose an approved skill to merge into.");
    }
    await db
      .update(reviews)
      .set({
        skillsUsed: sql`array_replace(${reviews.skillsUsed}, ${pending.name}, ${targetName})`,
        updatedAt: new Date(),
      })
      .where(sql`${pending.name} = any(${reviews.skillsUsed})`);
    await db.update(skills).set({ status: "rejected" }).where(eq(skills.id, pending.id));
    return { id: pending.id };
  }

  if (!input.intoId || input.intoId === input.id) {
    throw new ApiError(400, "invalid_body", "Choose a different company to merge into.", {
      intoId: "Choose a different company to merge into.",
    });
  }

  const pending = await requirePendingEmployer(input.id);
  const [target] = await db.select().from(employers).where(eq(employers.id, input.intoId)).limit(1);
  if (!target || target.status !== "approved") {
    throw new ApiError(404, "not_found", "Choose an approved company to merge into.");
  }

  await db
    .update(rotations)
    .set({ employerId: target.id, updatedAt: new Date() })
    .where(eq(rotations.employerId, pending.id));

  const aliases = new Set(target.aliases);
  if (normalizeEmployerName(pending.name) !== target.normalizedName) {
    aliases.add(pending.name);
  }
  await db.update(employers).set({ aliases: [...aliases] }).where(eq(employers.id, target.id));
  await db.delete(employers).where(eq(employers.id, pending.id));
  return { id: pending.id };
}
