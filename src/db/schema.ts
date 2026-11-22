import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean, check, doublePrecision, index, integer, jsonb, numeric, pgTable, primaryKey, text, timestamp,
  uniqueIndex, uuid, vector,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  // Email domain, set when the row is created. profiles.school is what the student types.
  school: text("school"),
  major: text("major"),                       // approved catalog name; null for custom, undecided, or before onboarding
  // catalog | custom | undecided. Null on rows that have not been backfilled.
  majorSource: text("major_source"),
  // Private until a founder approves or merges it. Never a public aggregate key.
  customMajorText: text("custom_major_text"),
  majorSubmissionId: uuid("major_submission_id").references((): AnyPgColumn => majorSubmissions.id, {
    onDelete: "set null",
  }),
  exploringMajors: boolean("exploring_majors").notNull().default(false),
  dismissedCareerRoles: text("dismissed_career_roles").array().notNull().default(sql`'{}'::text[]`),
  interestedCareerRoles: text("interested_career_roles").array().notNull().default(sql`'{}'::text[]`),
  year: integer("year"),                      // 1-5; null until onboarding
  coopTrack: text("coop_track"),              // optional free label
  consentPrivacyAt: timestamp("consent_privacy_at", { withTimezone: true }),
  consentDataUseAt: timestamp("consent_data_use_at", { withTimezone: true }),
  // Versioned opt-in for anonymous company aggregates and Direction evidence.
  shareReviewsConsentAt: timestamp("share_reviews_consent_at", { withTimezone: true }),
  shareReviewsConsentVersion: integer("share_reviews_consent_version"),
  // Version of the privacy policy last agreed to (PRIVACY_POLICY_VERSION). Below current: asked again.
  privacyPolicyVersion: integer("privacy_policy_version"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  source: text("source").notNull().default("early"),   // 'early' | 'launch'
  invitedByUserId: uuid("invited_by_user_id").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  shareFreeTextDefault: boolean("share_free_text_default").notNull().default(false),
  createdAt,
  updatedAt,
}, (t) => [
  check("users_year_range", sql`${t.year} is null or ${t.year} between 1 and 5`),
  check(
    "users_major_source",
    sql`${t.majorSource} is null or ${t.majorSource} in ('catalog', 'custom', 'undecided')`,
  ),
]);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  school: text("school"),                                     // self-reported; null until onboarding saves it
  goal: text("goal").notNull(),                               // 'industry' | 'grad_school' | 'undecided'
  goalNotes: text("goal_notes"),
  // Legacy, no longer written (0010). 'cincinnati_only' | 'within_drive' | 'anywhere'. Drop in a later cleanup.
  locationConstraint: text("location_constraint"),
  constraintsNotes: text("constraints_notes"),
  // Home city: a Census place (src/content/places). Label and point copied from the place on save.
  homePlaceGeoid: text("home_place_geoid"),
  homeLabel: text("home_label"),
  homeLat: doublePrecision("home_lat"),
  homeLng: doublePrecision("home_lng"),
  radiusMiles: integer("radius_miles"),                       // 25 | 50 | 100 | 250
  openToAnywhere: boolean("open_to_anywhere").notNull().default(false),
  openToRemote: boolean("open_to_remote").notNull().default(false),
  // Up to 3 of mentorship, learning, enjoyment, clarity, pay, would_return (collected from PR 3.5).
  priorities: text("priorities").array().notNull().default(sql`'{}'::text[]`),
  profileVector: vector("profile_vector", { dimensions: 20 }),// 20 Mini-IPIP item answers, in content order
  vectorVersion: integer("vector_version"),
  createdAt,
  updatedAt,
}, (t) => [
  check("profiles_radius_miles", sql`${t.radiusMiles} is null or ${t.radiusMiles} in (25, 50, 100, 250)`),
  check(
    "profiles_home_complete",
    sql`(${t.homePlaceGeoid} is null and ${t.homeLabel} is null and ${t.homeLat} is null and ${t.homeLng} is null) or (${t.homePlaceGeoid} is not null and ${t.homeLabel} is not null and ${t.homeLat} is not null and ${t.homeLng} is not null)`,
  ),
  check(
    "profiles_priorities",
    sql`cardinality(${t.priorities}) <= 3 and ${t.priorities} <@ array['mentorship', 'learning', 'enjoyment', 'clarity', 'pay', 'would_return']::text[]`,
  ),
]);

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  instrument: text("instrument").notNull(),          // 'mini_ipip_20' (older rows may say onet_mini_ip_30)
  rawAnswers: jsonb("raw_answers").$type<Record<string, number>>().notNull(),
  scored: jsonb("scored").$type<Record<string, number>>().notNull(),
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("assessments_user_taken_idx").on(t.userId, t.takenAt),
]);

export const employers = pgTable("employers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),                       // canonical display name
  normalizedName: text("normalized_name").notNull(),  // normalizeEmployerName(name)
  aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
  industry: text("industry"),
  city: text("city"),
  status: text("status").notNull().default("pending"),// 'approved' | 'pending' | 'rejected'
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt,
}, (t) => [
  uniqueIndex("employers_normalized_name_uq").on(t.normalizedName),
]);

export const rotations = pgTable("rotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  employerId: uuid("employer_id").notNull().references(() => employers.id, { onDelete: "restrict" }),
  roleTitle: text("role_title").notNull(),
  roleType: text("role_type").notNull(),              // one of ROLE_TYPE_VALUES in src/features/review/roles.ts
  termSeason: text("term_season").notNull(),          // 'spring' | 'summer' | 'fall'
  termYear: integer("term_year").notNull(),
  rotationNumber: integer("rotation_number").notNull(),
  payHourly: numeric("pay_hourly", { precision: 6, scale: 2 }),  // optional
  wouldReturn: text("would_return").notNull(),        // 'yes' | 'maybe' | 'no' — "Would you go back?"
  // Optional: where the co-op was, a Census place. Private to the student for now.
  workPlaceGeoid: text("work_place_geoid"),
  workLabel: text("work_label"),
  source: text("source").notNull().default("early"),
  createdAt,
  updatedAt,
}, (t) => [
  uniqueIndex("rotations_user_number_uq").on(t.userId, t.rotationNumber),
  index("rotations_employer_idx").on(t.employerId),
  check("rotations_number_range", sql`${t.rotationNumber} between 1 and 8`),
  check("rotations_would_return", sql`${t.wouldReturn} in ('yes', 'maybe', 'no')`),
  check("rotations_work_place_complete", sql`(${t.workPlaceGeoid} is null) = (${t.workLabel} is null)`),
  check(
    "rotations_role_type",
    sql`${t.roleType} in ('design', 'test_validation', 'manufacturing_process', 'software', 'data_analytics', 'research', 'field_site', 'business_operations', 'finance', 'marketing', 'healthcare_clinical', 'healthcare_admin', 'laboratory', 'teaching', 'counseling_support', 'policy_research', 'writing_media', 'other')`,
  ),
]);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  rotationId: uuid("rotation_id").notNull().unique().references(() => rotations.id, { onDelete: "cascade" }),
  enjoyment: integer("enjoyment").notNull(),
  learning: integer("learning").notNull(),
  mentorship: integer("mentorship").notNull(),
  clarityGained: integer("clarity_gained").notNull(),
  skillsUsed: text("skills_used").array().notNull().default(sql`'{}'::text[]`),
  freeText: text("free_text"),
  shareFreeText: boolean("share_free_text").notNull().default(false),
  source: text("source").notNull().default("early"),
  createdAt,
  updatedAt,
}, (t) => [
  check("reviews_ratings_range", sql`${t.enjoyment} between 1 and 5 and ${t.learning} between 1 and 5 and ${t.mentorship} between 1 and 5 and ${t.clarityGained} between 1 and 5`),
]);

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  kind: text("kind").notNull(),                       // 'technical' | 'non_technical'
  status: text("status").notNull().default("pending"),// 'approved' | 'pending' | 'rejected'
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt,
}, (t) => [
  uniqueIndex("skills_normalized_name_uq").on(t.normalizedName),
  check("skills_kind", sql`${t.kind} in ('technical', 'non_technical')`),
  check("skills_status", sql`${t.status} in ('approved', 'pending', 'rejected')`),
]);

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  page: text("page").notNull(),
  message: text("message").notNull(),
  createdAt,
}, (t) => [
  index("feedback_user_created_idx").on(t.userId, t.createdAt),
]);

export const majorCatalog = pgTable("major_catalog", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  category: text("category").notNull(),
  aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
  status: text("status").notNull().default("approved"), // 'approved' | 'retired'
  createdAt,
  updatedAt,
}, (t) => [
  uniqueIndex("major_catalog_normalized_name_uq").on(t.normalizedName),
  check("major_catalog_status", sql`${t.status} in ('approved', 'retired')`),
]);

export const majorAliases = pgTable("major_aliases", {
  normalizedName: text("normalized_name").primaryKey(),
  canonicalName: text("canonical_name").notNull(),
  createdAt,
});

export const majorSubmissions = pgTable("major_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rawName: text("raw_name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | merged | rejected
  catalogId: uuid("catalog_id").references(() => majorCatalog.id, { onDelete: "set null" }),
  mergedIntoName: text("merged_into_name"),
  createdAt,
  updatedAt,
}, (t) => [
  index("major_submissions_user_status_idx").on(t.userId, t.status),
  uniqueIndex("major_submissions_one_pending_per_user").on(t.userId).where(sql`${t.status} = 'pending'`),
  check("major_submissions_status", sql`${t.status} in ('pending', 'approved', 'merged', 'rejected')`),
]);

// Career Atlas (migration 0007). One mark per student per map node. Node ids are the
// stable Atlas ids (dom:, fam:, spec:, occ:onet:). 'pursuing' is the student's chosen
// direction: at most one per student, and it implies Interested.
export const careerAtlasMarks = pgTable("career_atlas_marks", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  nodeId: text("node_id").notNull(),
  mark: text("mark").notNull(), // interested | dismissed | pursuing
  createdAt,
  updatedAt,
}, (t) => [
  primaryKey({ columns: [t.userId, t.nodeId], name: "career_atlas_marks_pk" }),
  uniqueIndex("career_atlas_marks_one_pursuing").on(t.userId).where(sql`${t.mark} = 'pursuing'`),
  check("career_atlas_marks_mark", sql`${t.mark} in ('interested', 'dismissed', 'pursuing')`),
  check("career_atlas_marks_node", sql`${t.nodeId} ~ '^((dom|fam|spec):[a-z0-9-]+|occ:onet:[0-9]{2}-[0-9]{4}[.][0-9]{2})$'`),
]);

// Career Atlas preference answers. One row per student per question id.
export const careerAtlasAnswers = pgTable("career_atlas_answers", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  questionId: text("question_id").notNull(),
  answer: text("answer").notNull(), // a | b | both | unsure
  createdAt,
  updatedAt,
}, (t) => [
  primaryKey({ columns: [t.userId, t.questionId], name: "career_atlas_answers_pk" }),
  check("career_atlas_answers_answer", sql`${t.answer} in ('a', 'b', 'both', 'unsure')`),
  check("career_atlas_answers_question", sql`${t.questionId} ~ '^[a-z0-9-]{1,64}$'`),
]);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type Employer = typeof employers.$inferSelect;
export type Rotation = typeof rotations.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type SkillRow = typeof skills.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type MajorCatalogRow = typeof majorCatalog.$inferSelect;
export type MajorSubmission = typeof majorSubmissions.$inferSelect;
export type CareerAtlasMark = typeof careerAtlasMarks.$inferSelect;
export type CareerAtlasAnswer = typeof careerAtlasAnswers.$inferSelect;
