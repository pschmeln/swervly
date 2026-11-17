-- Nov 17, 2026. One migration for the week. Safe on a live database:
-- no row wipes and no drop of user rows. The 30-number interest
-- vector cannot be cast to 20 Mini-IPIP answers, so those values are cleared
-- and the column is recreated empty. Old assessment rows stay.
-- return_offer is copied into would_return before it is dropped.
-- Existing rotations get role_type 'other' so the new required field can be set.

ALTER TABLE "users" ADD COLUMN "school" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invited_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "share_free_text_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "users" SET "school" = lower(split_part("email", '@', 2)) WHERE "school" IS NULL AND position('@' in "email") > 1;--> statement-breakpoint
UPDATE "profiles" SET "vector_version" = NULL WHERE "profile_vector" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "profile_vector";--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "profile_vector" vector(20);--> statement-breakpoint
ALTER TABLE "rotations" ADD COLUMN "would_return" text;--> statement-breakpoint
ALTER TABLE "rotations" ADD COLUMN "role_type" text;--> statement-breakpoint
UPDATE "rotations" SET "would_return" = CASE "return_offer" WHEN 'yes' THEN 'yes' WHEN 'no' THEN 'no' ELSE 'maybe' END WHERE "would_return" IS NULL;--> statement-breakpoint
UPDATE "rotations" SET "role_type" = 'other' WHERE "role_type" IS NULL;--> statement-breakpoint
ALTER TABLE "rotations" ALTER COLUMN "would_return" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rotations" ALTER COLUMN "role_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "rotations" DROP COLUMN "return_offer";--> statement-breakpoint
ALTER TABLE "rotations" ADD CONSTRAINT "rotations_would_return" CHECK ("would_return" in ('yes', 'maybe', 'no'));--> statement-breakpoint
ALTER TABLE "rotations" ADD CONSTRAINT "rotations_role_type" CHECK ("role_type" in ('design', 'test_validation', 'manufacturing_process', 'software', 'data_analytics', 'research', 'field_site', 'other'));--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_kind" CHECK ("kind" in ('technical', 'non_technical')),
	CONSTRAINT "skills_status" CHECK ("status" in ('approved', 'pending', 'rejected'))
);--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "skills_normalized_name_uq" ON "skills" USING btree ("normalized_name");--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"page" text NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "feedback_user_created_idx" ON "feedback" USING btree ("user_id","created_at");