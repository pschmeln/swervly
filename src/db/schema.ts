import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean, check, index, integer, jsonb, numeric, pgTable, text, timestamp,
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
  major: text("major"),                       // one of MAJORS; null until onboarding
  year: integer("year"),                      // 1-5; null until onboarding
  coopTrack: text("coop_track"),              // optional free label
  consentPrivacyAt: timestamp("consent_privacy_at", { withTimezone: true }),
  consentDataUseAt: timestamp("consent_data_use_at", { withTimezone: true }),
  // Versioned opt-in for anonymous company aggregates and Direction evidence.
  shareReviewsConsentAt: timestamp("share_reviews_consent_at", { withTimezone: true }),
  shareReviewsConsentVersion: integer("share_reviews_consent_version"),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  source: text("source").notNull().default("early"),   // 'early' | 'launch'
  invitedByUserId: uuid("invited_by_user_id").references((): AnyPgColumn => users.id, { onDelete: "set null" }),
  shareFreeTextDefault: boolean("share_free_text_default").notNull().default(false),
  createdAt,
  updatedAt,
}, (t) => [
  check("users_year_range", sql`${t.year} is null or ${t.year} between 1 and 5`),
]);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  school: text("school"),                                     // self-reported; null until onboarding saves it
  goal: text("goal").notNull(),                               // 'industry' | 'grad_school' | 'undecided'
  goalNotes: text("goal_notes"),
  locationConstraint: text("location_constraint").notNull(),  // 'cincinnati_only' | 'within_drive' | 'anywhere'
  constraintsNotes: text("constraints_notes"),
  profileVector: vector("profile_vector", { dimensions: 20 }),// 20 Mini-IPIP item answers, in content order
  vectorVersion: integer("vector_version"),
  createdAt,
  updatedAt,
});

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
  roleType: text("role_type").notNull(),              // design | test_validation | manufacturing_process | software | data_analytics | research | field_site | other
  termSeason: text("term_season").notNull(),          // 'spring' | 'summer' | 'fall'
  termYear: integer("term_year").notNull(),
  rotationNumber: integer("rotation_number").notNull(),
  payHourly: numeric("pay_hourly", { precision: 6, scale: 2 }),  // optional
  wouldReturn: text("would_return").notNull(),        // 'yes' | 'maybe' | 'no' — "Would you go back?"
  source: text("source").notNull().default("early"),
  createdAt,
  updatedAt,
}, (t) => [
  uniqueIndex("rotations_user_number_uq").on(t.userId, t.rotationNumber),
  index("rotations_employer_idx").on(t.employerId),
  check("rotations_number_range", sql`${t.rotationNumber} between 1 and 5`),
  check("rotations_would_return", sql`${t.wouldReturn} in ('yes', 'maybe', 'no')`),
  check(
    "rotations_role_type",
    sql`${t.roleType} in ('design', 'test_validation', 'manufacturing_process', 'software', 'data_analytics', 'research', 'field_site', 'other')`,
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

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type Employer = typeof employers.$inferSelect;
export type Rotation = typeof rotations.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type SkillRow = typeof skills.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
