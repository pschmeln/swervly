import type { MajorFamily } from "@/features/majors/catalog";

/**
 * Skills shown first in the review form, by major. Everything else in the
 * catalog sits behind "Show all skills". Names must exist in SKILL_CATALOG
 * (tests/review/major-skills.test.ts checks this).
 *
 * Engineering and computing majors get their own list because their work
 * differs a lot. Other majors use their family's list. Draft for founder
 * approval, Nov 18, 2026.
 */

const PEOPLE = ["Team collaboration", "Presenting", "Project management"] as const;

export const MAJOR_SKILLS: Readonly<Record<string, readonly string[]>> = {
  // Engineering & Technology
  "Aerospace Engineering": ["CAD", "Simulation and modeling", "Testing and validation", "Materials testing", "Data analysis", "Technical writing", ...PEOPLE],
  "Architectural Engineering": ["CAD", "Structural analysis", "Cost estimating", "Site work and inspection", "Safety and compliance", "Technical writing", ...PEOPLE],
  "Biomedical Engineering": ["Medical devices", "Lab experiments", "CAD", "Testing and validation", "Quality assurance", "Data analysis", ...PEOPLE],
  "Chemical Engineering": ["Process design", "Process improvement", "Lab experiments", "Safety and compliance", "Data analysis", "Root cause analysis", ...PEOPLE],
  "Civil Engineering": ["Structural analysis", "CAD", "Site work and inspection", "Cost estimating", "Safety and compliance", "Field work", ...PEOPLE],
  "Construction Management": ["Cost estimating", "Site work and inspection", "Safety and compliance", "Field work", "Spreadsheets and Excel", "Working with customers", ...PEOPLE],
  "Electrical Engineering": ["Circuit design", "Embedded systems", "Power systems", "Controls and PLCs", "Testing and validation", "Technical troubleshooting", ...PEOPLE],
  "Environmental Engineering": ["Environmental sampling", "Field work", "Data analysis", "Safety and compliance", "Lab experiments", "Technical writing", ...PEOPLE],
  "Industrial & Systems Engineering": ["Process improvement", "Data analysis", "Simulation and modeling", "Supply chain and logistics", "Quality assurance", "Spreadsheets and Excel", ...PEOPLE],
  "Mechanical Engineering": ["CAD", "Manufacturing", "Testing and validation", "Simulation and modeling", "Root cause analysis", "Technical troubleshooting", ...PEOPLE],
  "Engineering Technology": ["Technical troubleshooting", "Manufacturing", "Controls and PLCs", "CAD", "Testing and validation", "Quality assurance", ...PEOPLE],
  "Materials Engineering": ["Materials testing", "Lab experiments", "Manufacturing", "Data analysis", "Root cause analysis", "Technical writing", ...PEOPLE],

  // Computer Science & Information Technology
  "Computer Science": ["Programming", "Web development", "Databases and SQL", "Cloud and DevOps", "Machine learning", "Testing and validation", ...PEOPLE],
  "Computer Engineering": ["Programming", "Embedded systems", "Circuit design", "Testing and validation", "Technical troubleshooting", "Networking", ...PEOPLE],
  "Cybersecurity Engineering": ["Cybersecurity", "Networking", "Programming", "Cloud and DevOps", "Technical troubleshooting", "Safety and compliance", ...PEOPLE],
  "Software Engineering": ["Programming", "Web development", "Testing and validation", "Cloud and DevOps", "Databases and SQL", "Technical writing", ...PEOPLE],
  "Information Technology": ["IT support", "Networking", "Cybersecurity", "Cloud and DevOps", "Technical troubleshooting", "Working with customers", ...PEOPLE],
  "Information Systems": ["Databases and SQL", "Data analysis", "IT support", "Process improvement", "Spreadsheets and Excel", "Working with customers", ...PEOPLE],
  "Data Science": ["Data analysis", "Programming", "Machine learning", "Statistics", "Databases and SQL", "Research", ...PEOPLE],
  Cybersecurity: ["Cybersecurity", "Networking", "IT support", "Technical troubleshooting", "Safety and compliance", "Technical writing", ...PEOPLE],
};

export const FAMILY_SKILLS: Readonly<Record<MajorFamily, readonly string[]>> = {
  engineering: ["CAD", "Testing and validation", "Data analysis", "Technical troubleshooting", "Technical writing", "Safety and compliance", ...PEOPLE],
  computing: ["Programming", "Databases and SQL", "Testing and validation", "Technical troubleshooting", "Cloud and DevOps", "Data analysis", ...PEOPLE],
  business: ["Spreadsheets and Excel", "Market research", "Sales", "Working with customers", "Data analysis", "Process improvement", ...PEOPLE],
  economics: ["Financial modeling", "Spreadsheets and Excel", "Data analysis", "Statistics", "Research", "Accounting", ...PEOPLE],
  natural_science: ["Lab experiments", "Research", "Data analysis", "Statistics", "Field work", "Technical writing", ...PEOPLE],
  healthcare: ["Patient care", "Clinical documentation", "Health education", "Research", "Safety and compliance", "Working with customers", ...PEOPLE],
  social_science: ["Research", "Interviewing people", "Case management", "Data analysis", "Statistics", "Writing and editing", ...PEOPLE],
  arts_humanities: ["Writing and editing", "Research", "Graphic design", "Content creation", "Video and photo editing", "Working with customers", ...PEOPLE],
  education: ["Teaching and tutoring", "Lesson planning", "Writing and editing", "Working with customers", "Content creation", "Leading a meeting", ...PEOPLE],
  communication: ["Writing and editing", "Content creation", "Social media", "Video and photo editing", "Graphic design", "Market research", ...PEOPLE],
  math: ["Data analysis", "Statistics", "Programming", "Simulation and modeling", "Financial modeling", "Research", ...PEOPLE],
  interdisciplinary: ["Research", "Data analysis", "Writing and editing", "Project management", "Working with customers", "Team collaboration", "Presenting"],
  unknown: [],
};
