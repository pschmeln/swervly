-- Location for any college, work city on co-ops, priorities, privacy policy version (Nov 2026, Stage 3).
--
-- profiles
--   Adds home city (Census place GEOID, label, internal point), radius, "Open to anywhere",
--   "Open to remote" and up to 3 priorities (collected from PR 3.5; empty until then).
--   location_constraint becomes nullable and is no longer written. Existing rows:
--     'anywhere'        -> open_to_anywhere = true, no home city
--     'cincinnati_only' -> Cincinnati, OH within 25 miles
--     'within_drive'    -> Cincinnati, OH within 250 miles
--   (Every account so far signed up as a UC student.) location_constraint keeps its old value.
-- rotations
--   Adds an optional work city (where the co-op was). Existing rows: both null.
-- users
--   Adds privacy_policy_version. Existing rows that accepted the privacy policy get 1, so they
--   are asked to agree to version 2 at their next visit. Rows that never accepted stay null.
--
-- Forward-only. Nothing is dropped. To go back: drop the new columns and constraints, and
-- set location_constraint NOT NULL again only after every row has a value.
ALTER TABLE "profiles" ADD COLUMN "home_place_geoid" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "home_label" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "home_lat" double precision;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "home_lng" double precision;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "radius_miles" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "open_to_anywhere" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "open_to_remote" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "priorities" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "location_constraint" DROP NOT NULL;--> statement-breakpoint
UPDATE "profiles" SET "open_to_anywhere" = true WHERE "location_constraint" = 'anywhere';--> statement-breakpoint
UPDATE "profiles"
SET "home_place_geoid" = '3915000',
    "home_label" = 'Cincinnati, OH',
    "home_lat" = 39.1402,
    "home_lng" = -84.5058,
    "radius_miles" = CASE "location_constraint" WHEN 'cincinnati_only' THEN 25 ELSE 250 END
WHERE "location_constraint" IN ('cincinnati_only', 'within_drive');--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_radius_miles" CHECK ("profiles"."radius_miles" is null or "profiles"."radius_miles" in (25, 50, 100, 250));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_home_complete" CHECK (("profiles"."home_place_geoid" is null and "profiles"."home_label" is null and "profiles"."home_lat" is null and "profiles"."home_lng" is null) or ("profiles"."home_place_geoid" is not null and "profiles"."home_label" is not null and "profiles"."home_lat" is not null and "profiles"."home_lng" is not null));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_priorities" CHECK (cardinality("profiles"."priorities") <= 3 and "profiles"."priorities" <@ array['mentorship', 'learning', 'enjoyment', 'clarity', 'pay', 'would_return']::text[]);--> statement-breakpoint
ALTER TABLE "rotations" ADD COLUMN "work_place_geoid" text;--> statement-breakpoint
ALTER TABLE "rotations" ADD COLUMN "work_label" text;--> statement-breakpoint
ALTER TABLE "rotations" ADD CONSTRAINT "rotations_work_place_complete" CHECK (("rotations"."work_place_geoid" is null) = ("rotations"."work_label" is null));--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "privacy_policy_version" integer;--> statement-breakpoint
UPDATE "users" SET "privacy_policy_version" = 1 WHERE "consent_privacy_at" IS NOT NULL;
