-- Career Atlas: saved marks and preference answers (Stage D, Nov 2026).
-- Additive: two new tables. No existing row or column changes.
-- Both cascade on user delete, so delete-my-account removes them.
CREATE TABLE "career_atlas_marks" (
	"user_id" uuid NOT NULL,
	"node_id" text NOT NULL,
	"mark" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_atlas_marks_pk" PRIMARY KEY("user_id","node_id"),
	CONSTRAINT "career_atlas_marks_mark" CHECK ("career_atlas_marks"."mark" in ('interested', 'dismissed', 'pursuing')),
	CONSTRAINT "career_atlas_marks_node" CHECK ("career_atlas_marks"."node_id" ~ '^((dom|fam|spec):[a-z0-9-]+|occ:onet:[0-9]{2}-[0-9]{4}[.][0-9]{2})$')
);
--> statement-breakpoint
CREATE TABLE "career_atlas_answers" (
	"user_id" uuid NOT NULL,
	"question_id" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_atlas_answers_pk" PRIMARY KEY("user_id","question_id"),
	CONSTRAINT "career_atlas_answers_answer" CHECK ("career_atlas_answers"."answer" in ('a', 'b', 'both', 'unsure')),
	CONSTRAINT "career_atlas_answers_question" CHECK ("career_atlas_answers"."question_id" ~ '^[a-z0-9-]{1,64}$')
);
--> statement-breakpoint
ALTER TABLE "career_atlas_marks" ADD CONSTRAINT "career_atlas_marks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "career_atlas_answers" ADD CONSTRAINT "career_atlas_answers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "career_atlas_marks_one_pursuing" ON "career_atlas_marks" USING btree ("user_id") WHERE "career_atlas_marks"."mark" = 'pursuing';
