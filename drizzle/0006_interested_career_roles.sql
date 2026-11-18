-- Careers a student marked "Interested" on Direction (founder request, Nov 18, 2026).
-- Additive: a new array column with an empty default. No existing row changes.
ALTER TABLE "users" ADD COLUMN "interested_career_roles" text[] DEFAULT '{}'::text[] NOT NULL;
