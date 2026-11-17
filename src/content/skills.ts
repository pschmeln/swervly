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
] as const;

export type SkillKind = (typeof SKILL_CATALOG)[number]["kind"];
export type SkillName = (typeof SKILL_CATALOG)[number]["name"];

export const SKILLS = SKILL_CATALOG.map((skill) => skill.name);

export function skillKind(name: string): SkillKind | null {
  const found = SKILL_CATALOG.find((skill) => skill.name === name);
  return found ? found.kind : null;
}
