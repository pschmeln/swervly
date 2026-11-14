import { sql } from "drizzle-orm";
import {
  boolean, check, index, integer, jsonb, numeric, pgTable, text, timestamp,
  uniqueIndex, uuid, vector,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  major: text("major"),                       // one of MAJORS; null until onboarding
  year: integer("year"),                      // 1-5; null until onboarding
  coopTrack: text("coop_track"),              // optional free label
  consentPrivacyAt: timestamp("consent_privacy_at", { withTimezone: true }),
  consentDataUseAt: timestamp("consent_data_use_at", { withTimezone: true }),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  source: text("source").notNull().default("early"),   // 'early' | 'launch'
  createdAt,
  updatedAt,
}, (t) => [
  check("users_year_range", sql`${t.year} is null or ${t.year} between 1 and 5`),
]);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  goal: text("goal").notNull(),                               // 'industry' | 'grad_school' | 'undecided'
  goalNotes: text("goal_notes"),
  locationConstraint: text("location_constraint").notNull(),  // 'cincinnati_only' | 'within_drive' | 'anywhere'
  constraintsNotes: text("constraints_notes"),
  profileVector: vector("profile_vector", { dimensions: 30 }),// null until the assessment is saved
  vectorVersion: integer("vector_version"),
  createdAt,
  updatedAt,
});

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  instrument: text("instrument").notNull(),          // 'onet_mini_ip_30'
  rawAnswers: jsonb("raw_answers").$type<Record<string, number>>().notNull(),  // itemId -> 1..5
  scored: jsonb("scored").$type<Record<string, number>>().notNull(),           // R,I,A,S,E,C -> mean 1..5
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
  status: text("status").notNull().default("pending"),// 'approved' | 'pending'
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
  termSeason: text("term_season").notNull(),          // 'spring' | 'summer' | 'fall'
  termYear: integer("term_year").notNull(),
  rotationNumber: integer("rotation_number").notNull(),
  payHourly: numeric("pay_hourly", { precision: 6, scale: 2 }),  // optional
  returnOffer: text("return_offer").notNull(),        // 'yes' | 'no' | 'pending' | 'not_applicable'
  source: text("source").notNull().default("early"),
  createdAt,
  updatedAt,
}, (t) => [
  uniqueIndex("rotations_user_number_uq").on(t.userId, t.rotationNumber),
  index("rotations_employer_idx").on(t.employerId),
  check("rotations_number_range", sql`${t.rotationNumber} between 1 and 5`),
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

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type Employer = typeof employers.$inferSelect;
export type Rotation = typeof rotations.$inferSelect;
export type Review = typeof reviews.$inferSelect;
