/**
 * Swervly Lane B — Skills Used choices for a co-op review.
 * Human-facing canonical labels; store these exact values in reviews.skillsUsed.
 * Keep in sync with RotationInput's Zod enum (max 10 selections).
 */
export const SKILLS = [
  "Programming",
  "Data analysis",
  "Machine learning & AI",
  "CAD & 3D modeling",
  "Circuit design",
  "Embedded systems",
  "Control systems",
  "Simulation & modeling",
  "Testing & validation",
  "Lab experiments",
  "Prototyping",
  "Manufacturing",
  "Process improvement",
  "Quality assurance",
  "Technical troubleshooting",
  "Field work",
  "Safety & compliance",
  "Technical writing",
  "Data visualization",
  "Project management",
  "Team collaboration",
  "Customer communication",
  "Other",
] as const;

export type Skill = (typeof SKILLS)[number];
