-- Advisors: schools, their email domains, advisor accounts, rosters, student grants, view log
-- (Nov 2026, Stage 6, item 15, decision D9).
--
-- New tables only. Existing rows are not changed.
-- schools            a school's name. Founders create them.
-- school_domains     the email domains a school's people sign in with (UC: uc.edu and mail.uc.edu).
-- advisor_accounts   one per advisor: their school, the name students see, and the founders'
--                    decision (pending, approved, revoked). Deleted with the user's account.
-- advisor_roster     students an advisor's school listed, stored only as a keyed hash of the email
--                    (PR 6.2). No plain addresses.
-- advisor_grants     a student's explicit, revocable opt-in for one school's advisors (PR 6.3).
-- advisor_view_log   every time an advisor opens a student's details (PR 6.3). The student can read
--                    it. advisor_name is kept if the advisor's account is deleted.
--
-- Apply AFTER 0012_referrals_points (journal "when" 1796000000000): drizzle-kit skips any migration
-- whose "when" is at or below the last one applied.
-- Forward-only. To go back: drop the six tables.
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schools_name_unique" UNIQUE("name"),
	CONSTRAINT "schools_name_len" CHECK (char_length("schools"."name") between 2 and 120)
);
--> statement-breakpoint
CREATE TABLE "school_domains" (
	"domain" text PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_domains_format" CHECK ("school_domains"."domain" ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$')
);
--> statement-breakpoint
CREATE TABLE "advisor_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"school_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_user_id" uuid,
	CONSTRAINT "advisor_accounts_status" CHECK ("advisor_accounts"."status" in ('pending', 'approved', 'revoked')),
	CONSTRAINT "advisor_accounts_name_len" CHECK (char_length("advisor_accounts"."display_name") between 2 and 80)
);
--> statement-breakpoint
CREATE TABLE "advisor_roster" (
	"school_id" uuid NOT NULL,
	"email_hmac" text NOT NULL,
	"added_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advisor_roster_pk" PRIMARY KEY("school_id","email_hmac")
);
--> statement-breakpoint
CREATE TABLE "advisor_grants" (
	"student_user_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"consent_version" integer NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "advisor_grants_pk" PRIMARY KEY("student_user_id","school_id")
);
--> statement-breakpoint
CREATE TABLE "advisor_view_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"advisor_user_id" uuid,
	"advisor_name" text NOT NULL,
	"student_user_id" uuid NOT NULL,
	"school_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"fields" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
ALTER TABLE "school_domains" ADD CONSTRAINT "school_domains_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "advisor_accounts" ADD CONSTRAINT "advisor_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "advisor_accounts" ADD CONSTRAINT "advisor_accounts_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "advisor_accounts" ADD CONSTRAINT "advisor_accounts_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "advisor_roster" ADD CONSTRAINT "advisor_roster_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "advisor_roster" ADD CONSTRAINT "advisor_roster_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "advisor_grants" ADD CONSTRAINT "advisor_grants_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "advisor_grants" ADD CONSTRAINT "advisor_grants_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "advisor_view_log" ADD CONSTRAINT "advisor_view_log_advisor_user_id_users_id_fk" FOREIGN KEY ("advisor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "advisor_view_log" ADD CONSTRAINT "advisor_view_log_student_user_id_users_id_fk" FOREIGN KEY ("student_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "advisor_view_log" ADD CONSTRAINT "advisor_view_log_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "school_domains_school_idx" ON "school_domains" USING btree ("school_id");
--> statement-breakpoint
CREATE INDEX "advisor_accounts_school_idx" ON "advisor_accounts" USING btree ("school_id");
--> statement-breakpoint
CREATE INDEX "advisor_grants_school_active_idx" ON "advisor_grants" USING btree ("school_id") WHERE "advisor_grants"."revoked_at" is null;
--> statement-breakpoint
CREATE INDEX "advisor_view_log_student_idx" ON "advisor_view_log" USING btree ("student_user_id","viewed_at" DESC NULLS LAST);
