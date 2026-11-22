-- Community: posts, answers, review comments, Helpful marks, reports, rate limits (Nov 2026, Stage 4).
--
-- New tables only, plus two nullable columns on users. Existing rows are not changed.
-- community_posts       questions, advice and (from PR 4.5) archetype posts. Visible at once
--                       (D3); founders hide, restore or remove reported items (PR 4.3).
--                       author_user_id is SET NULL so a post others replied to can stay as an
--                       erased tombstone when its author deletes their account (D11).
-- community_comments    answers on a post, or comments on a shared company review (PR 4.4).
--                       Exactly one of post_id / review_id. Deleted with the author's account.
-- community_helpful     one Helpful mark per student per post or comment.
-- community_reports     one report per student per post or comment, from a closed list of reasons.
-- community_rate_buckets per-student hourly counters for posting, answering, reporting, Helpful.
-- users.community_terms_version / community_terms_at: when the student agreed to the Community
--                       rules (needed before posting, answering or reporting).
--
-- Forward-only. To go back: drop the five tables and the two users columns.
CREATE TABLE "community_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_user_id" uuid,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"employer_id" uuid,
	"role_type" text,
	"atlas_family" text,
	"archetype_id" text,
	"archetype_version" integer,
	"status" text DEFAULT 'visible' NOT NULL,
	"status_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	CONSTRAINT "community_posts_kind" CHECK ("community_posts"."kind" in ('question', 'advice', 'archetype')),
	CONSTRAINT "community_posts_status" CHECK ("community_posts"."status" in ('visible', 'hidden', 'removed', 'deleted')),
	CONSTRAINT "community_posts_title_len" CHECK (char_length("community_posts"."title") <= 140),
	CONSTRAINT "community_posts_body_len" CHECK (char_length("community_posts"."body") <= 4000)
);
--> statement-breakpoint
CREATE TABLE "community_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid,
	"review_id" uuid,
	"author_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"status_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"edited_at" timestamp with time zone,
	CONSTRAINT "community_comments_one_target" CHECK (("community_comments"."post_id" is null) <> ("community_comments"."review_id" is null)),
	CONSTRAINT "community_comments_status" CHECK ("community_comments"."status" in ('visible', 'hidden', 'removed')),
	CONSTRAINT "community_comments_body_len" CHECK (char_length("community_comments"."body") between 1 and 2000)
);
--> statement-breakpoint
CREATE TABLE "community_helpful" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"post_id" uuid,
	"comment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_helpful_one_target" CHECK (("community_helpful"."post_id" is null) <> ("community_helpful"."comment_id" is null))
);
--> statement-breakpoint
CREATE TABLE "community_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_user_id" uuid NOT NULL,
	"post_id" uuid,
	"comment_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "community_reports_one_target" CHECK (("community_reports"."post_id" is null) <> ("community_reports"."comment_id" is null)),
	CONSTRAINT "community_reports_reason" CHECK ("community_reports"."reason" in ('spam', 'private_info', 'unsafe', 'off_topic'))
);
--> statement-breakpoint
CREATE TABLE "community_rate_buckets" (
	"user_id" uuid NOT NULL,
	"action" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "community_rate_buckets_pk" PRIMARY KEY("user_id","action","window_start")
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "community_terms_version" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "community_terms_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_review_id_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_comments" ADD CONSTRAINT "community_comments_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_helpful" ADD CONSTRAINT "community_helpful_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_helpful" ADD CONSTRAINT "community_helpful_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_helpful" ADD CONSTRAINT "community_helpful_comment_id_community_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."community_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_comment_id_community_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."community_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_rate_buckets" ADD CONSTRAINT "community_rate_buckets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_posts_visible_created_idx" ON "community_posts" USING btree ("created_at" DESC) WHERE "community_posts"."status" = 'visible';--> statement-breakpoint
CREATE INDEX "community_posts_employer_idx" ON "community_posts" USING btree ("employer_id") WHERE "community_posts"."status" = 'visible';--> statement-breakpoint
CREATE INDEX "community_posts_author_idx" ON "community_posts" USING btree ("author_user_id");--> statement-breakpoint
CREATE INDEX "community_comments_post_idx" ON "community_comments" USING btree ("post_id","created_at");--> statement-breakpoint
CREATE INDEX "community_comments_review_idx" ON "community_comments" USING btree ("review_id","created_at");--> statement-breakpoint
CREATE INDEX "community_comments_author_idx" ON "community_comments" USING btree ("author_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_helpful_post_uq" ON "community_helpful" USING btree ("user_id","post_id") WHERE "community_helpful"."post_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "community_helpful_comment_uq" ON "community_helpful" USING btree ("user_id","comment_id") WHERE "community_helpful"."comment_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "community_reports_post_uq" ON "community_reports" USING btree ("reporter_user_id","post_id") WHERE "community_reports"."post_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "community_reports_comment_uq" ON "community_reports" USING btree ("reporter_user_id","comment_id") WHERE "community_reports"."comment_id" is not null;--> statement-breakpoint
CREATE INDEX "community_reports_open_idx" ON "community_reports" USING btree ("created_at") WHERE "community_reports"."resolved_at" is null;
