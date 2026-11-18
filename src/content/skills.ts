/**
 * Starting skill list for co-op reviews. Starter names are approved for everyone.
 * Students can add a skill; that row stays pending until a founder approves it.
 */
export const SKILL_CATALOG = [
  { name: "Programming", kind: "technical" },
  { name: "CAD", kind: "technical" },
  { name: "Circuit design", kind: "technical" },
  { name: "Testing and validation", kind: "technical" },
  { name: "Data analysis", kind: "technical" },
  { name: "Manufacturing", kind: "technical" },
  { name: "Lab experiments", kind: "technical" },
  { name: "Embedded systems", kind: "technical" },
  { name: "Simulation and modeling", kind: "technical" },
  { name: "Technical troubleshooting", kind: "technical" },
  { name: "Process improvement", kind: "technical" },
  { name: "Technical writing", kind: "technical" },
  { name: "Quality assurance", kind: "technical" },
  { name: "Presenting", kind: "non_technical" },
  { name: "Working with customers", kind: "non_technical" },
  { name: "Leading a meeting", kind: "non_technical" },
  { name: "Project management", kind: "non_technical" },
  { name: "Team collaboration", kind: "non_technical" },
  { name: "Field work", kind: "non_technical" },
  { name: "Safety and compliance", kind: "non_technical" },
  // Added Nov 18, 2026 so each major has skills that fit it (src/content/major-skills.ts).
  { name: "Materials testing", kind: "technical" },
  { name: "Structural analysis", kind: "technical" },
  { name: "Cost estimating", kind: "technical" },
  { name: "Medical devices", kind: "technical" },
  { name: "Process design", kind: "technical" },
  { name: "Root cause analysis", kind: "technical" },
  { name: "Power systems", kind: "technical" },
  { name: "Controls and PLCs", kind: "technical" },
  { name: "Environmental sampling", kind: "technical" },
  { name: "Supply chain and logistics", kind: "technical" },
  { name: "Spreadsheets and Excel", kind: "technical" },
  { name: "Web development", kind: "technical" },
  { name: "Databases and SQL", kind: "technical" },
  { name: "Cloud and DevOps", kind: "technical" },
  { name: "Machine learning", kind: "technical" },
  { name: "Networking", kind: "technical" },
  { name: "Cybersecurity", kind: "technical" },
  { name: "IT support", kind: "technical" },
  { name: "Statistics", kind: "technical" },
  { name: "Research", kind: "technical" },
  { name: "Financial modeling", kind: "technical" },
  { name: "Accounting", kind: "technical" },
  { name: "Patient care", kind: "technical" },
  { name: "Clinical documentation", kind: "technical" },
  { name: "Graphic design", kind: "technical" },
  { name: "Video and photo editing", kind: "technical" },
  { name: "Site work and inspection", kind: "non_technical" },
  { name: "Market research", kind: "non_technical" },
  { name: "Sales", kind: "non_technical" },
  { name: "Interviewing people", kind: "non_technical" },
  { name: "Case management", kind: "non_technical" },
  { name: "Writing and editing", kind: "non_technical" },
  { name: "Content creation", kind: "non_technical" },
  { name: "Teaching and tutoring", kind: "non_technical" },
  { name: "Lesson planning", kind: "non_technical" },
  { name: "Social media", kind: "non_technical" },
  { name: "Health education", kind: "non_technical" },
] as const;

export type SkillKind = (typeof SKILL_CATALOG)[number]["kind"];
export type SkillName = (typeof SKILL_CATALOG)[number]["name"];

export const SKILLS = SKILL_CATALOG.map((skill) => skill.name);

export function skillKind(name: string): SkillKind | null {
  const found = SKILL_CATALOG.find((skill) => skill.name === name);
  return found ? found.kind : null;
}
