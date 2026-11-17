import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { majorAliases, majorCatalog, majorSubmissions, users } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { isFounderEmail } from "@/lib/founders";
import { APPROVED_CUSTOM_CATEGORY } from "./catalog";
import { loadMajorSearchContext } from "./load";
import { planMajorModeration } from "./moderation-plan";

export const MajorModerationInput = z
  .object({
    action: z.enum(["approve", "reject", "merge"]),
    kind: z.literal("major"),
    id: z.uuid(),
    intoName: z.string().trim().min(1).max(120).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.action === "merge" && !input.intoName) {
      ctx.addIssue({
        code: "custom",
        path: ["intoName"],
        message: "Choose a major to merge into.",
      });
    }
  });

export type MajorModerationInput = z.infer<typeof MajorModerationInput>;

export async function moderateMajor(
  actorEmail: string,
  input: MajorModerationInput,
): Promise<{ id: string }> {
  if (!isFounderEmail(actorEmail)) {
    throw new ApiError(404, "not_found", "Not found.");
  }

  const [pending] = await db
    .select()
    .from(majorSubmissions)
    .where(eq(majorSubmissions.id, input.id))
    .limit(1);
  if (!pending || pending.status !== "pending") {
    throw new ApiError(404, "not_found", "That item is no longer waiting.");
  }

  const context = await loadMajorSearchContext();
  const planned = planMajorModeration(
    {
      action: input.action,
      submission: pending,
      intoName: input.intoName,
    },
    context,
  );
  if (!planned.ok) {
    throw new ApiError(400, "invalid_body", planned.message, { intoName: planned.message });
  }

  const now = new Date();
  const ownPending = and(
    eq(majorSubmissions.id, pending.id),
    eq(majorSubmissions.userId, pending.userId),
    eq(majorSubmissions.status, "pending"),
  );

  if (planned.plan.type === "reject") {
    await db.update(majorSubmissions).set({ status: "rejected", updatedAt: now }).where(ownPending);
    return { id: pending.id };
  }

  if (planned.plan.type === "merge") {
    const plan = planned.plan;
    const submissionUpdate = db
      .update(majorSubmissions)
      .set({ status: "merged", mergedIntoName: plan.canonicalName, updatedAt: now })
      .where(ownPending);
    const userUpdate = db
      .update(users)
      .set({
        major: plan.canonicalName,
        majorSource: "catalog",
        majorSubmissionId: pending.id,
        updatedAt: now,
      })
      .where(and(eq(users.id, pending.userId), eq(users.majorSubmissionId, pending.id)));
    if (plan.addAlias) {
      await db.batch([
        db
          .insert(majorAliases)
          .values({
            normalizedName: plan.normalizedAlias,
            canonicalName: plan.canonicalName,
          })
          .onConflictDoNothing(),
        submissionUpdate,
        userUpdate,
      ]);
    } else {
      await db.batch([submissionUpdate, userUpdate]);
    }
    return { id: pending.id };
  }

  const plan = planned.plan;
  const catalogId = crypto.randomUUID();
  await db.batch([
    db.insert(majorCatalog).values({
      id: catalogId,
      name: plan.name,
      normalizedName: plan.normalizedName,
      category: APPROVED_CUSTOM_CATEGORY,
      aliases: [],
      status: "approved",
    }),
    db
      .update(majorSubmissions)
      .set({
        status: "approved",
        catalogId,
        mergedIntoName: plan.name,
        updatedAt: now,
      })
      .where(ownPending),
    db
      .update(users)
      .set({
        major: plan.name,
        majorSource: "catalog",
        majorSubmissionId: pending.id,
        updatedAt: now,
      })
      .where(and(eq(users.id, pending.userId), eq(users.majorSubmissionId, pending.id))),
  ]);
  return { id: pending.id };
}
