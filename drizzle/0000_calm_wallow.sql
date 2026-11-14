CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"instrument" text NOT NULL,
	"raw_answers" jsonb NOT NULL,
	"scored" jsonb NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"industry" text,
	"city" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"goal" text NOT NULL,
	"goal_notes" text,
	"location_constraint" text NOT NULL,
	"constraints_notes" text,
	"profile_vector" vector(30),
	"vector_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rotation_id" uuid NOT NULL,
	"enjoyment" integer NOT NULL,
	"learning" integer NOT NULL,
	"mentorship" integer NOT NULL,
	"clarity_gained" integer NOT NULL,
	"skills_used" text[] DEFAULT '{}'::text[] NOT NULL,
	"free_text" text,
	"share_free_text" boolean DEFAULT false NOT NULL,
	"source" text DEFAULT 'early' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rotation_id_unique" UNIQUE("rotation_id"),
	CONSTRAINT "reviews_ratings_range" CHECK ("reviews"."enjoyment" between 1 and 5 and "reviews"."learning" between 1 and 5 and "reviews"."mentorship" between 1 and 5 and "reviews"."clarity_gained" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "rotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"employer_id" uuid NOT NULL,
	"role_title" text NOT NULL,
	"term_season" text NOT NULL,
	"term_year" integer NOT NULL,
	"rotation_number" integer NOT NULL,
	"pay_hourly" numeric(6, 2),
	"return_offer" text NOT NULL,
	"source" text DEFAULT 'early' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rotations_number_range" CHECK ("rotations"."rotation_number" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"major" text,
	"year" integer,
	"coop_track" text,
	"consent_privacy_at" timestamp with time zone,
	"consent_data_use_at" timestamp with time zone,
	"onboarded_at" timestamp with time zone,
	"source" text DEFAULT 'early' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_year_range" CHECK ("users"."year" is null or "users"."year" between 1 and 5)
);
--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employers" ADD CONSTRAINT "employers_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rotation_id_rotations_id_fk" FOREIGN KEY ("rotation_id") REFERENCES "public"."rotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rotations" ADD CONSTRAINT "rotations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rotations" ADD CONSTRAINT "rotations_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessments_user_taken_idx" ON "assessments" USING btree ("user_id","taken_at");--> statement-breakpoint
CREATE UNIQUE INDEX "employers_normalized_name_uq" ON "employers" USING btree ("normalized_name");--> statement-breakpoint
CREATE UNIQUE INDEX "rotations_user_number_uq" ON "rotations" USING btree ("user_id","rotation_number");--> statement-breakpoint
CREATE INDEX "rotations_employer_idx" ON "rotations" USING btree ("employer_id");