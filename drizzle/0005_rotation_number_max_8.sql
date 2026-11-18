-- Allow up to 8 co-ops or internships per student (was 5). Founder decision, Nov 18, 2026.
-- Widens the CHECK only. Every existing row (1-5) already satisfies 1-8, so no row changes.
-- Forward-only. To go back to 5, first make sure no row has rotation_number above 5.
ALTER TABLE "rotations" DROP CONSTRAINT "rotations_number_range";--> statement-breakpoint
ALTER TABLE "rotations" ADD CONSTRAINT "rotations_number_range" CHECK ("rotations"."rotation_number" between 1 and 8);
