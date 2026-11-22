import type { ExtraCareerRole } from "@/features/direction/career-roles";
import type { MajorFamily } from "@/features/majors/catalog";
import { traitBand } from "@/features/profile/traits";
import type { RoleType } from "@/features/review/roles";
import type { DirectionContext } from "@/features/direction/rules";

/**
 * Direction's editorial rules (founder-written from Big Five bands and majors).
 * Not a validated career assessment: copy describes the student's own answers.
 * The engine that applies them is src/features/direction/rules.ts.
 */

export type CareerRole = RoleType | ExtraCareerRole;

export type QuizRule = {
  role: CareerRole;
  points: number;
  when: (context: DirectionContext) => boolean;
  reason: string;
  /** Matches everyone. Used to fill engineering suggestions, never as a quiz signal. */
  fallback?: true;
};

// ---- Engineering co-op rules --------------------------------------------------------------

export const SOFTWARE: ReadonlySet<string> = new Set([
  "Computer Engineering",
  "Computer Science",
  "Cybersecurity Engineering",
  "Electrical Engineering",
]);
export const DESIGN: ReadonlySet<string> = new Set([
  "Mechanical Engineering",
  "Aerospace Engineering",
  "Architectural Engineering",
  "Civil Engineering",
  "Biomedical Engineering",
  "Engineering Technology",
  "Industrial & Systems Engineering",
]);
export const PROCESS: ReadonlySet<string> = new Set([
  "Chemical Engineering",
  "Industrial & Systems Engineering",
  "Mechanical Engineering",
  "Engineering Technology",
]);
export const DATA: ReadonlySet<string> = new Set([
  "Computer Science",
  "Computer Engineering",
  "Electrical Engineering",
  "Industrial & Systems Engineering",
]);
export const FIELD: ReadonlySet<string> = new Set([
  "Civil Engineering",
  "Environmental Engineering",
  "Construction Management",
  "Architectural Engineering",
]);
export const RESEARCH_MAJORS: ReadonlySet<string> = new Set([
  "Biomedical Engineering",
  "Chemical Engineering",
  "Electrical Engineering",
  "Computer Science",
]);

export const RULES: readonly (QuizRule & { role: RoleType })[] = [
  {
    role: "design",
    points: 3,
    when: (context) => traitBand(context.traits.openness) === "high" && DESIGN.has(context.major),
    reason: "You like unfamiliar problems, and your major lines up with design work.",
  },
  {
    role: "design",
    points: 2,
    when: (context) =>
      traitBand(context.traits.openness) === "high" &&
      traitBand(context.traits.conscientiousness) !== "low",
    reason: "You like new problems and you can carry a plan through.",
  },
  {
    role: "test_validation",
    points: 3,
    when: (context) =>
      traitBand(context.traits.conscientiousness) === "high" &&
      traitBand(context.traits.openness) !== "high",
    reason: "You like a plan, and you prefer checking a known method over inventing one.",
  },
  {
    role: "test_validation",
    points: 2,
    when: (context) =>
      traitBand(context.traits.conscientiousness) === "high" &&
      traitBand(context.traits.neuroticism) === "low",
    reason: "You stay steady and thorough, which fits test and validation work.",
  },
  {
    role: "manufacturing_process",
    points: 3,
    when: (context) => PROCESS.has(context.major) && traitBand(context.traits.conscientiousness) !== "low",
    reason: "Your major and the way you follow a plan line up with process work.",
  },
  {
    role: "manufacturing_process",
    points: 2,
    when: (context) => context.goal === "industry" && traitBand(context.traits.conscientiousness) === "high",
    reason: "You want industry work, and you like a process you can tighten.",
  },
  {
    role: "software",
    points: 3,
    when: (context) => SOFTWARE.has(context.major),
    reason: "Your major lines up directly with software work.",
  },
  {
    role: "software",
    points: 2,
    when: (context) => traitBand(context.traits.openness) === "high" && SOFTWARE.has(context.major),
    reason: "You like new problems, and your major is close to software.",
  },
  {
    role: "data_analytics",
    points: 3,
    when: (context) =>
      DATA.has(context.major) &&
      traitBand(context.traits.conscientiousness) !== "low" &&
      traitBand(context.traits.openness) !== "low",
    reason: "You can follow a method and still dig into a new question, which fits data work.",
  },
  {
    role: "data_analytics",
    points: 2,
    when: (context) =>
      traitBand(context.traits.conscientiousness) === "high" && traitBand(context.traits.openness) === "high",
    reason: "You like both a careful process and an unfamiliar question.",
  },
  {
    role: "research",
    points: 3,
    when: (context) => context.goal === "grad_school" && traitBand(context.traits.openness) !== "low",
    reason: "Graduate school is your goal, and you are open to unfamiliar questions.",
  },
  {
    role: "research",
    points: 2,
    when: (context) =>
      RESEARCH_MAJORS.has(context.major) &&
      traitBand(context.traits.openness) === "high" &&
      traitBand(context.traits.extraversion) !== "high",
    reason: "You like new ideas and quieter focus, which fits research.",
  },
  {
    role: "field_site",
    points: 3,
    when: (context) => FIELD.has(context.major) && traitBand(context.traits.extraversion) !== "low",
    reason: "Your major often means site work, and you are comfortable around people.",
  },
  {
    role: "field_site",
    points: 2,
    when: (context) =>
      traitBand(context.traits.extraversion) === "high" && traitBand(context.traits.agreeableness) !== "low",
    reason: "You gain energy around people, which fits field and site roles.",
  },
  {
    role: "design",
    points: 1,
    when: (context) => traitBand(context.traits.openness) === "high",
    reason: "You like unfamiliar problems, which suits design work.",
  },
  {
    role: "test_validation",
    points: 1,
    when: () => true,
    fallback: true,
    reason: "Test and validation is a core engineering co-op and a solid place to start.",
  },
];

/** Roles that fill an engineering list when fewer than three rules matched, in order. */
export const FILL_ORDER: readonly RoleType[] = [
  "design",
  "test_validation",
  "software",
  "manufacturing_process",
  "data_analytics",
  "research",
  "field_site",
];

// ---- Other majors -------------------------------------------------------------------------

/** Roles each non-engineering group of majors opens, in editorial order. */
export const FAMILY_SUGGESTIONS: Partial<Record<MajorFamily, readonly { role: CareerRole; reason: string }[]>> = {
  business: [
    { role: "business_operations", reason: "Operations is a natural path from a business major." },
    { role: "marketing", reason: "Marketing is a natural path from a business major." },
    { role: "finance", reason: "Finance is a natural path from a business major." },
  ],
  economics: [
    { role: "finance", reason: "Your major lines up directly with finance work." },
    { role: "policy_research", reason: "Policy work draws directly on your major." },
    { role: "business_operations", reason: "Operations is a natural next step from your major." },
  ],
  healthcare: [
    { role: "healthcare_clinical", reason: "Clinical work is the core path from a healthcare major." },
    { role: "healthcare_admin", reason: "Healthcare administration builds on your major." },
  ],
  natural_science: [
    { role: "laboratory", reason: "Laboratory work is a core path from a science major." },
    { role: "research", reason: "Research is a natural path from a science major." },
  ],
  social_science: [
    { role: "policy_research", reason: "Policy and research work build directly on your major." },
    { role: "counseling_support", reason: "Counseling and support work build on your major." },
  ],
  education: [
    { role: "teaching", reason: "Teaching is the core path from an education major." },
    { role: "counseling_support", reason: "Student support work builds on an education major." },
  ],
  arts_humanities: [
    { role: "writing_media", reason: "Writing and media work build directly on your major." },
    { role: "teaching", reason: "Teaching is a natural path from your major." },
  ],
  communication: [
    { role: "writing_media", reason: "Your major lines up directly with writing and media work." },
    { role: "marketing", reason: "Marketing is a natural path from your major." },
  ],
  math: [
    { role: "data_analytics", reason: "Your major lines up directly with data work." },
    { role: "research", reason: "Research is a natural path from a math major." },
  ],
  interdisciplinary: [
    { role: "policy_research", reason: "Research work suits an interdisciplinary major." },
    { role: "writing_media", reason: "Writing is a natural path from an interdisciplinary major." },
  ],
  computing: [
    { role: "software", reason: "Software is the core path from a computing major." },
    { role: "data_analytics", reason: "Data work is a natural path from a computing major." },
  ],
};

/**
 * Quiz rules for roles outside the engineering co-op table (editorial, like RULES).
 * Written by the founders from Big Five bands. Not a validated career assessment,
 * so the copy describes the student's answers and never cites outcomes.
 */
export const EXTRA_RULES: readonly QuizRule[] = [
  {
    role: "healthcare_clinical",
    points: 3,
    when: (c) => traitBand(c.traits.agreeableness) === "high" && traitBand(c.traits.extraversion) !== "low",
    reason: "You look out for people and are comfortable around them, which fits hands-on care.",
  },
  {
    role: "healthcare_clinical",
    points: 2,
    when: (c) => traitBand(c.traits.conscientiousness) === "high" && traitBand(c.traits.neuroticism) === "low",
    reason: "You stay steady and careful, which clinical work asks for.",
  },
  {
    role: "healthcare_admin",
    points: 3,
    when: (c) => traitBand(c.traits.conscientiousness) === "high" && traitBand(c.traits.extraversion) !== "high",
    reason: "You like a plan and steady, organized work, which fits healthcare administration.",
  },
  {
    role: "teaching",
    points: 3,
    when: (c) => traitBand(c.traits.extraversion) === "high" && traitBand(c.traits.agreeableness) === "high",
    reason: "You gain energy around people and look out for them, which fits teaching.",
  },
  {
    role: "counseling_support",
    points: 3,
    when: (c) => traitBand(c.traits.agreeableness) === "high" && traitBand(c.traits.neuroticism) !== "high",
    reason: "You look out for people and stay steady, which fits support work.",
  },
  {
    role: "business_operations",
    points: 3,
    when: (c) => traitBand(c.traits.conscientiousness) === "high" && traitBand(c.traits.extraversion) !== "low",
    reason: "You like a plan and you work well with people, which fits operations.",
  },
  {
    role: "finance",
    points: 2,
    when: (c) => traitBand(c.traits.conscientiousness) === "high" && traitBand(c.traits.openness) !== "high",
    reason: "You like a careful, known method, which fits finance work.",
  },
  {
    role: "marketing",
    points: 3,
    when: (c) => traitBand(c.traits.extraversion) === "high" && traitBand(c.traits.openness) === "high",
    reason: "You like new ideas and being around people, which fits marketing.",
  },
  {
    role: "laboratory",
    points: 2,
    when: (c) => traitBand(c.traits.conscientiousness) === "high" && traitBand(c.traits.extraversion) !== "high",
    reason: "You're careful and you like focused work, which fits lab work.",
  },
  {
    role: "policy_research",
    points: 3,
    when: (c) => c.goal === "grad_school" && traitBand(c.traits.openness) === "high",
    reason: "Graduate school is your goal, and you like unfamiliar questions.",
  },
  {
    role: "policy_research",
    points: 2,
    when: (c) => traitBand(c.traits.openness) === "high" && traitBand(c.traits.extraversion) !== "high",
    reason: "You like new ideas and quieter focus, which fits research-style work.",
  },
  {
    role: "writing_media",
    points: 3,
    when: (c) => traitBand(c.traits.openness) === "high" && traitBand(c.traits.extraversion) !== "high",
    reason: "You like new ideas and quieter focus, which fits writing.",
  },
];
