import { and, asc, count, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { pointsLedger, users } from "@/db/schema";

/** Points for one friend finishing onboarding. Not granted again on a quiz retake. */
export const REFERRAL_POINTS = 100;

/** unique (user_id, reason, slot) plus this range is the cap, including under concurrent onboarding. */
export const REFERRAL_SLOT_CAP = 10;

export const REFERRAL_ONBOARDED_REASON = "referral_onboarded";

/**
 * Smallest integer in 1..REFERRAL_SLOT_CAP that is not already used.
 * The award statement picks the same slot in SQL. Returns null when all 10 are taken.
 */
export function lowestFreeSlot(used: readonly number[]): number | null {
  const taken = new Set<number>();
  for (const slot of used) {
    if (Number.isInteger(slot) && slot >= 1 && slot <= REFERRAL_SLOT_CAP) taken.add(slot);
  }
  for (let slot = 1; slot <= REFERRAL_SLOT_CAP; slot += 1) {
    if (!taken.has(slot)) return slot;
  }
  return null;
}

/**
 * Insert the referrer's award in the same db.batch as the first onboarding write, and before
 * onboarded_at is set, so this still sees onboarded_at is null. Neon HTTP runs the batch as one
 * transaction: a unique violation would roll onboarding back, so conflicts do nothing and a full
 * cap inserts no row. A retake, a missing referrer, and a self-referral all match zero rows.
 *
 * The slot is the same rule as lowestFreeSlot. Table names are written out so the lookup cannot
 * bind to the wrong row.
 */
export function referralOnboardingAward(userId: string) {
  const id = crypto.randomUUID();
  return db.insert(pointsLedger).select(sql`
    select
      ${id}::uuid,
      candidate.user_id,
      ${REFERRAL_POINTS},
      ${REFERRAL_ONBOARDED_REASON},
      candidate.referred_user_id,
      candidate.slot,
      now()
    from (
      select
        "users"."invited_by_user_id" as user_id,
        "users"."id" as referred_user_id,
        (
          select gs.slot
          from generate_series(1, ${REFERRAL_SLOT_CAP}) as gs(slot)
          where not exists (
            select 1
            from "points_ledger"
            where "points_ledger"."user_id" = "users"."invited_by_user_id"
              and "points_ledger"."reason" = ${REFERRAL_ONBOARDED_REASON}
              and "points_ledger"."slot" = gs.slot
          )
          order by gs.slot
          limit 1
        ) as slot
      from "users"
      where "users"."id" = ${userId}::uuid
        and "users"."onboarded_at" is null
        and "users"."consent_privacy_at" is not null
        and "users"."consent_data_use_at" is not null
        and "users"."invited_by_user_id" is not null
        and "users"."invited_by_user_id" <> "users"."id"
    ) candidate
    where candidate.slot is not null
  `).onConflictDoNothing();
}

export function finishedOnboardingsQuery(referrerId: string) {
  return db
    .select({ value: count() })
    .from(users)
    .where(and(eq(users.invitedByUserId, referrerId), isNotNull(users.onboardedAt)));
}

export function pointsBalanceQuery(userId: string) {
  return db
    .select({ value: sql<string | number>`coalesce(sum(${pointsLedger.amount}), 0)` })
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId));
}

/** The caller's ledger rows only. referral_code is already on the exported users row. */
export function pointsLedgerExportQuery(userId: string) {
  return db
    .select()
    .from(pointsLedger)
    .where(eq(pointsLedger.userId, userId))
    .orderBy(asc(pointsLedger.createdAt), asc(pointsLedger.id));
}

function finiteNumber(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

export async function referralSummary(userId: string): Promise<{ points: number; finishedOnboardings: number }> {
  const [counts, balances] = await db.batch([finishedOnboardingsQuery(userId), pointsBalanceQuery(userId)]);
  return {
    finishedOnboardings: finiteNumber(counts[0]?.value),
    points: finiteNumber(balances[0]?.value),
  };
}
