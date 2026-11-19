-- Co-op role types outside engineering (Nov 2026), so non-engineering students can log what
-- they did and their reviews can count as Direction evidence for that role.
-- Widens the CHECK only. Every existing row already uses one of the old values, so no row changes.
-- Forward-only. To go back, first make sure no row uses one of the new values.
ALTER TABLE "rotations" DROP CONSTRAINT "rotations_role_type";--> statement-breakpoint
ALTER TABLE "rotations" ADD CONSTRAINT "rotations_role_type" CHECK ("rotations"."role_type" in ('design', 'test_validation', 'manufacturing_process', 'software', 'data_analytics', 'research', 'field_site', 'business_operations', 'finance', 'marketing', 'healthcare_clinical', 'healthcare_admin', 'laboratory', 'teaching', 'counseling_support', 'policy_research', 'writing_media', 'other'));
