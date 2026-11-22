-- Drop two legacy columns nothing reads or writes any more (item 2 cleanup, Nov 22, 2026).
--
-- users.coop_track            "Co-op track" was removed from onboarding, Profile and the privacy
--                             page in Stage 1 (#44). Existing values are deleted.
-- profiles.location_constraint the old Cincinnati-only / within-a-drive / anywhere choice, replaced
--                             by home city, radius and open-to flags in 0010 (#53), which backfilled
--                             them from this column. Existing values are deleted.
--
-- Forward-only and destructive: the dropped values can't be recovered from the database afterwards.
-- Apply only with Peter's yes, ideally right before the pre-launch wipe. To go back: re-add both
-- columns as nullable text (empty).
ALTER TABLE "users" DROP COLUMN IF EXISTS "coop_track";
--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "location_constraint";
