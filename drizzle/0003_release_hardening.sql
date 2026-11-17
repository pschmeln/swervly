-- Release hardening (forward-only). Safe on a live database: no row wipes.
-- 1) Mark historical would_return values as unanswered. Migration 0002 copied
--    return_offer into would_return; those questions are not the same, so old
--    rows must not count in Yes/Maybe/No stats until a student confirms.
-- 2) Add versioned consent for sharing co-op reviews into anonymous aggregates
--    and Direction. Existing users stay opted out until they consent again.

ALTER TABLE "rotations" ADD COLUMN "would_return_answered" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "rotations" SET "would_return_answered" = false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "share_reviews_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "share_reviews_consent_version" integer;