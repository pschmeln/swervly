import type { CareerRole } from "@/features/direction/rule-data";

/**
 * Where each line of "Why this matched" comes from (V1-07, Nov 24, 2026). The card shows
 * the source next to every line, so a student can tell their own quiz answers apart from
 * an inference from their major and from what other students reported.
 */
export type ReasonKind = "quiz" | "major" | "goal" | "reviews" | "priority" | "general";

export type ReasonPart = { kind: ReasonKind; text: string };

/** Short source label shown before each line. */
export const REASON_KIND_LABEL: Record<ReasonKind, string> = {
  quiz: "Your quiz",
  major: "Your major",
  goal: "Your goal",
  reviews: "Student reviews",
  priority: "Your priorities",
  general: "Starting point",
};

/** One sentence per part, in order. Used as the plain `reason` for places that show one line. */
export function joinParts(parts: readonly ReasonPart[]): string {
  return parts.map((part) => part.text.trim()).filter(Boolean).join(" ");
}

/** What each role is called inside a sentence. */
const ROLE_WORK: Partial<Record<CareerRole, string>> = {
  software: "software work",
  design: "design work",
  manufacturing_process: "manufacturing and process work",
  data_analytics: "data work",
  research: "research",
  field_site: "field and site work",
  test_validation: "test and validation work",
};

/**
 * Coursework a major includes that carries into a role. Editorial, written for
 * engineering and computing majors (draft for founder review). Topics are core to the
 * major's curriculum, not read from the student's transcript, so the copy says what the
 * coursework includes and never that the student has the skill.
 */
const COURSEWORK: Readonly<Record<string, Partial<Record<CareerRole, string>>>> = {
  "Electrical Engineering": {
    software: "programming, digital logic and embedded systems",
    data_analytics: "signals, probability and programming",
    research: "electromagnetics, signals and lab work",
  },
  "Computer Engineering": {
    software: "programming, data structures and digital design",
    data_analytics: "programming, probability and signal processing",
  },
  "Computer Science": {
    software: "programming, algorithms and software design",
    data_analytics: "programming, statistics and databases",
    research: "algorithms, theory and programming",
  },
  "Cybersecurity Engineering": {
    software: "programming, networks and secure systems",
  },
  "Mechanical Engineering": {
    design: "CAD, mechanics and materials",
    manufacturing_process: "manufacturing methods, thermodynamics and materials",
  },
  "Aerospace Engineering": {
    design: "aerodynamics, structures and CAD",
  },
  "Architectural Engineering": {
    design: "building systems, structures and drafting",
    field_site: "building systems and construction methods",
  },
  "Civil Engineering": {
    design: "structures, drafting and site design",
    field_site: "surveying, soils and construction methods",
  },
  "Biomedical Engineering": {
    design: "biomechanics, CAD and device design",
    research: "lab methods, physiology and biomaterials",
  },
  "Engineering Technology": {
    design: "CAD, manufacturing methods and hands-on labs",
    manufacturing_process: "manufacturing methods and controls",
  },
  "Industrial & Systems Engineering": {
    design: "systems design and human factors",
    manufacturing_process: "operations research, quality and production systems",
    data_analytics: "statistics, optimization and simulation",
  },
  "Chemical Engineering": {
    manufacturing_process: "mass and energy balances, reactors and process control",
    research: "lab methods, thermodynamics and transport",
  },
  "Environmental Engineering": {
    field_site: "water quality, sampling and site assessment",
  },
  "Construction Management": {
    field_site: "construction methods, scheduling and estimating",
  },
};

/**
 * The major's line for a role: names the coursework when Swervly has it, otherwise says the
 * major is a common path into the work. Confident, and never claims the student has a skill.
 */
export function majorPart(major: string, role: CareerRole): ReasonPart {
  const work = ROLE_WORK[role] ?? "this kind of work";
  const topics = COURSEWORK[major]?.[role];
  const text = topics
    ? `${major} coursework includes ${topics}, which ${work} builds on.`
    : `${major || "Your major"} is a common path into ${work}.`;
  return { kind: "major", text };
}

/** For tests: every major and role with written coursework. */
export function courseworkEntries(): [string, CareerRole, string][] {
  return Object.entries(COURSEWORK).flatMap(([major, roles]) =>
    Object.entries(roles).map(([role, topics]) => [major, role as CareerRole, topics as string] as [string, CareerRole, string]),
  );
}
