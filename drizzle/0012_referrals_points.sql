-- Referral codes and points (G1). Hand-written. Do not edit after it is applied.
--
-- Existing rows:
--   users.referral_code is backfilled with a random URL-safe code (md5 of the row id plus a
--   fresh uuid, so two rows cannot share an input even if the clock matches). No points are
--   inserted for people who already finished onboarding. Invite links that used users.id stop
--   working in the app; there is no redirect table.
--   points_ledger is new and empty. A referrer's rows are removed with their account
--   (user_id ON DELETE CASCADE). A deleted friend's award stays, and referred_user_id becomes
--   null (ON DELETE SET NULL). Several null links are allowed: Postgres unique treats nulls
--   as distinct, so the one-award-per-friend constraint does not collide after deletion.
--
-- Caps live in the database: unique (user_id, reason, slot) is at most one row per slot 1–10,
-- and unique (reason, referred_user_id) is one award per friend. The app writes with
-- ON CONFLICT DO NOTHING so a race skips the award and still finishes onboarding.
--
-- Email invites are not in this migration.
--
-- Forward-only. To go back: drop points_ledger and users.referral_code.
ALTER TABLE "users" ADD COLUMN "referral_code" text;--> statement-breakpoint
UPDATE "users" SET "referral_code" = md5("id"::text || gen_random_uuid()::text) WHERE "referral_code" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "referral_code" SET DEFAULT md5(gen_random_uuid()::text);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "referral_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code");--> statement-breakpoint
CREATE TABLE "points_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"referred_user_id" uuid,
	"slot" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "points_ledger_reason" CHECK ("points_ledger"."reason" in ('referral_onboarded')),
	CONSTRAINT "points_ledger_slot_range" CHECK ("points_ledger"."slot" between 1 and 10),
	CONSTRAINT "points_ledger_user_reason_slot_uq" UNIQUE("user_id","reason","slot"),
	CONSTRAINT "points_ledger_reason_referred_uq" UNIQUE("reason","referred_user_id")
);
--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_ledger" ADD CONSTRAINT "points_ledger_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
