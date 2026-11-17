-- Release hardening (forward-only). Safe on a live database: no row wipes.
-- Versioned consent for sharing co-op reviews into anonymous aggregates and
-- Direction. Existing users stay opted out until they consent again.
--
-- Note on would_return / return_offer: migration 0002 copied return_offer into
-- would_return. The product was never publicly launched; this PR does not add
-- Unknown / unanswered backward-compat columns. New reviews require an
-- explicit Yes / Maybe / No for "Would you go back?".

ALTER TABLE "users" ADD COLUMN "share_reviews_consent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "share_reviews_consent_version" integer;