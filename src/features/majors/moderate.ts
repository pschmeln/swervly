import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { majorSubmissions } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { isFounderEmail } from "@/lib/founders";
import { APPROVED_CUSTOM_CATEGORY } from "./catalog";
import { loadMajorSearchContext } from "./load";
import { planMajorModeration } from "./moderation-plan";
import { resultRows } from "@/lib/db-errors";

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

  if (planned.plan.type === "reject") {
    await claimPendingSubmission({
      pending,
      status: "rejected",
      catalogId: null,
      mergedIntoName: null,
      mapUserTo: null,
      insertCatalog: null,
      alias: null,
    });
    return { id: pending.id };
  }

  if (planned.plan.type === "merge") {
    const plan = planned.plan;
    await claimPendingSubmission({
      pending,
      status: "merged",
      catalogId: null,
      mergedIntoName: plan.canonicalName,
      mapUserTo: plan.canonicalName,
      insertCatalog: null,
      alias: plan.addAlias
        ? { normalizedName: plan.normalizedAlias, canonicalName: plan.canonicalName }
        : null,
    });
    return { id: pending.id };
  }

  const plan = planned.plan;
  await claimPendingSubmission({
    pending,
    status: "approved",
    catalogId: crypto.randomUUID(),
    mergedIntoName: plan.name,
    mapUserTo: plan.name,
    insertCatalog: { name: plan.name, normalizedName: plan.normalizedName },
    alias: null,
  });
  return { id: pending.id };
}

type PendingClaim = {
  id: string;
  userId: string;
  normalizedName: string;
};

/**
 * One statement so a student save cannot land between the submission change and the profile change.
 * The submission updates only while it is still pending with the name the founder reviewed.
 * The profile updates only when it still points at that submission.
 */
async function claimPendingSubmission(input: {
  pending: PendingClaim;
  status: "approved" | "merged" | "rejected";
  catalogId: string | null;
  mergedIntoName: string | null;
  mapUserTo: string | null;
  insertCatalog: { name: string; normalizedName: string } | null;
  alias: { normalizedName: string; canonicalName: string } | null;
}): Promise<void> {
  const result = await db.execute<{ decided_count: number | string }>(sql`
    with decided as (
      update major_submissions
      set status = ${input.status},
          catalog_id = ${input.catalogId}::uuid,
          merged_into_name = ${input.mergedIntoName},
          updated_at = now()
      where id = ${input.pending.id}::uuid
        and user_id = ${input.pending.userId}::uuid
        and status = 'pending'
        and normalized_name = ${input.pending.normalizedName}
      returning id, user_id
    ),
    added_catalog as (
      insert into major_catalog (id, name, normalized_name, category, aliases, status)
      select ${input.catalogId}::uuid,
             ${input.insertCatalog?.name ?? ""},
             ${input.insertCatalog?.normalizedName ?? ""},
             ${APPROVED_CUSTOM_CATEGORY},
             '{}'::text[],
             'approved'
      from decided
      where ${input.insertCatalog ? sql`true` : sql`false`}
      returning id
    ),
    added_alias as (
      insert into major_aliases (normalized_name, canonical_name)
      select ${input.alias?.normalizedName ?? ""}, ${input.alias?.canonicalName ?? ""}
      from decided
      where ${input.alias ? sql`true` : sql`false`}
      on conflict (normalized_name) do nothing
      returning normalized_name
    ),
    mapped as (
      update users
      set major = ${input.mapUserTo},
          major_source = 'catalog',
          major_submission_id = decided.id,
          updated_at = now()
      from decided
      where users.id = decided.user_id
        and users.major_submission_id = decided.id
        and ${input.mapUserTo ? sql`true` : sql`false`}
      returning users.id
    )
    select (select count(*)::int from decided) as decided_count,
           (select count(*)::int from added_catalog) as catalog_count,
           (select count(*)::int from added_alias) as alias_count,
           (select count(*)::int from mapped) as mapped_count
  `);
  const decided = decidedCount(result);
  if (decided !== 1) {
    throw new ApiError(409, "conflict", "That item changed. Refresh and try again.");
  }
}

function decidedCount(result: unknown): number {
  const row = resultRows(result)[0];
  if (!row || typeof row !== "object" || !("decided_count" in row)) return 0;
  return Number(row.decided_count);
}
