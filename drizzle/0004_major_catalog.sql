-- Phase 2 majors (forward-only). Safe on a live database: no row wipes.
-- Existing users.major values are kept when they are already in the legacy
-- catalog. Any other non-null major is copied into custom_major_text and
-- cleared from users.major so an unapproved name is not a public group key.
-- New columns are nullable or have defaults. No DROP of major.

ALTER TABLE "users" ADD COLUMN "major_source" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "custom_major_text" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "major_submission_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "exploring_majors" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "dismissed_career_roles" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
UPDATE "users" SET "major_source" = 'catalog'
WHERE "major_source" IS NULL AND "major" IN (
  'Aerospace Engineering',
  'Architectural Engineering',
  'Biomedical Engineering',
  'Chemical Engineering',
  'Civil Engineering',
  'Computer Engineering',
  'Computer Science',
  'Construction Management',
  'Cybersecurity Engineering',
  'Electrical Engineering',
  'Environmental Engineering',
  'Industrial & Systems Engineering',
  'Mechanical Engineering',
  'Engineering Technology',
  'Other'
);--> statement-breakpoint
UPDATE "users" SET "custom_major_text" = "major", "major_source" = 'custom', "major" = NULL
WHERE "major_source" IS NULL AND "major" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_major_source" CHECK ("major_source" IS NULL OR "major_source" IN ('catalog', 'custom', 'undecided'));--> statement-breakpoint
CREATE TABLE "major_catalog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "category" text NOT NULL,
  "aliases" text[] DEFAULT '{}'::text[] NOT NULL,
  "status" text DEFAULT 'approved' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "major_catalog_status" CHECK ("status" in ('approved', 'retired'))
);--> statement-breakpoint
CREATE UNIQUE INDEX "major_catalog_normalized_name_uq" ON "major_catalog" USING btree ("normalized_name");--> statement-breakpoint
CREATE TABLE "major_aliases" (
  "normalized_name" text PRIMARY KEY NOT NULL,
  "canonical_name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "major_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "raw_name" text NOT NULL,
  "normalized_name" text NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "catalog_id" uuid,
  "merged_into_name" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "major_submissions_status" CHECK ("status" in ('pending', 'approved', 'merged', 'rejected'))
);--> statement-breakpoint
ALTER TABLE "major_submissions" ADD CONSTRAINT "major_submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "major_submissions" ADD CONSTRAINT "major_submissions_catalog_id_major_catalog_id_fk" FOREIGN KEY ("catalog_id") REFERENCES "public"."major_catalog"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "major_submissions_user_status_idx" ON "major_submissions" USING btree ("user_id","status");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_major_submission_id_major_submissions_id_fk" FOREIGN KEY ("major_submission_id") REFERENCES "public"."major_submissions"("id") ON DELETE set null ON UPDATE no action;