-- Action plans: student-owned tasks and skill progress (Phase 1, Nov 2026).
-- Additive: three new tables. No existing row or column changes.
-- Child rows use composite FK (plan_id, user_id) → action_plans (id, user_id)
-- so a task or skill row cannot reference another user's plan.
-- All cascade on user/plan delete. No share columns. No AI storage.
-- DO NOT apply until Allen approves; agents must not run db:migrate for this file without a yes.
CREATE TABLE "action_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_node_id" text NOT NULL,
	"goal_level" text NOT NULL,
	"goal_title" text NOT NULL,
	"goal_source" text NOT NULL,
	"draft_source" text NOT NULL,
	"status" text NOT NULL,
	"weekly_hours" integer,
	"horizon_weeks" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_plans_goal_level" CHECK ("action_plans"."goal_level" in ('specialization', 'occupation')),
	CONSTRAINT "action_plans_goal_source" CHECK ("action_plans"."goal_source" in ('atlas_pursuing', 'manual')),
	CONSTRAINT "action_plans_draft_source" CHECK ("action_plans"."draft_source" in ('template_v1')),
	CONSTRAINT "action_plans_status" CHECK ("action_plans"."status" in ('active', 'archived')),
	CONSTRAINT "action_plans_goal_node" CHECK ("action_plans"."goal_node_id" ~ '^((spec):[a-z0-9-]+|occ:onet:[0-9]{2}-[0-9]{4}[.][0-9]{2})$'),
	CONSTRAINT "action_plans_weekly_hours" CHECK ("action_plans"."weekly_hours" is null or ("action_plans"."weekly_hours" between 1 and 40)),
	CONSTRAINT "action_plans_horizon_weeks" CHECK ("action_plans"."horizon_weeks" is null or ("action_plans"."horizon_weeks" between 1 and 52))
);
--> statement-breakpoint
CREATE TABLE "action_tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"phase" text,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL,
	"origin" text NOT NULL,
	"origin_key" text,
	"explanation" text NOT NULL,
	"due_on" date,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_tasks_status" CHECK ("action_tasks"."status" in ('todo', 'doing', 'done')),
	CONSTRAINT "action_tasks_origin" CHECK ("action_tasks"."origin" in ('template', 'user', 'preserved')),
	CONSTRAINT "action_tasks_phase" CHECK ("action_tasks"."phase" is null or "action_tasks"."phase" in ('practice', 'prepare', 'explore', 'reflect'))
);
--> statement-breakpoint
CREATE TABLE "action_skill_progress" (
	"id" uuid PRIMARY KEY NOT NULL,
	"plan_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"skill_name" text NOT NULL,
	"scope" text NOT NULL,
	"evidence" text NOT NULL,
	"skill_source" text NOT NULL,
	"progress" text DEFAULT 'unrated' NOT NULL,
	"origin_key" text NOT NULL,
	"explanation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_skill_progress_scope" CHECK ("action_skill_progress"."scope" in ('shared', 'occupation_specific', 'optional_exploration')),
	CONSTRAINT "action_skill_progress_evidence" CHECK ("action_skill_progress"."evidence" in ('known', 'suggested', 'unknown')),
	CONSTRAINT "action_skill_progress_skill_source" CHECK ("action_skill_progress"."skill_source" in ('onet', 'editorial')),
	CONSTRAINT "action_skill_progress_progress" CHECK ("action_skill_progress"."progress" in ('unrated', 'learning', 'comfortable'))
);
--> statement-breakpoint
ALTER TABLE "action_plans" ADD CONSTRAINT "action_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "action_plans_id_user_uq" ON "action_plans" USING btree ("id","user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "action_plans_one_active" ON "action_plans" USING btree ("user_id") WHERE "action_plans"."status" = 'active';
--> statement-breakpoint
CREATE INDEX "action_plans_user_status_idx" ON "action_plans" USING btree ("user_id","status");
--> statement-breakpoint
ALTER TABLE "action_tasks" ADD CONSTRAINT "action_tasks_plan_user_fk" FOREIGN KEY ("plan_id","user_id") REFERENCES "public"."action_plans"("id","user_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "action_skill_progress" ADD CONSTRAINT "action_skill_progress_plan_user_fk" FOREIGN KEY ("plan_id","user_id") REFERENCES "public"."action_plans"("id","user_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "action_tasks_user_plan_idx" ON "action_tasks" USING btree ("user_id","plan_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "action_tasks_plan_origin_key_uq" ON "action_tasks" USING btree ("plan_id","origin_key") WHERE "action_tasks"."origin_key" is not null;
--> statement-breakpoint
CREATE INDEX "action_skill_progress_user_plan_idx" ON "action_skill_progress" USING btree ("user_id","plan_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "action_skill_progress_plan_origin_key_uq" ON "action_skill_progress" USING btree ("plan_id","origin_key");
