import type { MajorFamilyLink } from "@/features/atlas/types";

/**
 * Catalog major → career families it commonly opens (editorial).
 * Keys must be exact names from src/features/majors/catalog.ts.
 * This only orders the first screen; every family stays browsable.
 * A catalog major with no row here gets the open entry, like Undecided.
 */
const c = (family: MajorFamilyLink["family"]): MajorFamilyLink => ({ family, strength: "common" });
const s = (family: MajorFamilyLink["family"]): MajorFamilyLink => ({ family, strength: "sometimes" });

export const MAJOR_LINKS: Readonly<Record<string, readonly MajorFamilyLink[]>> = {
  // Engineering & Technology
  "Mechanical Engineering": [c("fam:design-development"), c("fam:manufacturing-automation"), c("fam:simulation-validation"), c("fam:energy-thermal"), s("fam:engineering-rd")],
  "Aerospace Engineering": [c("fam:design-development"), c("fam:simulation-validation"), s("fam:energy-thermal"), s("fam:engineering-rd")],
  "Biomedical Engineering": [c("fam:design-development"), c("fam:laboratory-science"), s("fam:engineering-rd")],
  "Chemical Engineering": [c("fam:chemical-process"), s("fam:manufacturing-automation"), s("fam:engineering-rd")],
  "Civil Engineering": [c("fam:construction-field"), s("fam:environmental"), s("fam:design-development")],
  "Architectural Engineering": [c("fam:construction-field"), s("fam:design-development")],
  "Construction Management": [c("fam:construction-field")],
  "Electrical Engineering": [c("fam:electronics-hardware"), s("fam:energy-thermal"), s("fam:software-engineering"), s("fam:engineering-rd")],
  "Environmental Engineering": [c("fam:environmental"), s("fam:construction-field")],
  "Industrial & Systems Engineering": [c("fam:manufacturing-automation"), c("fam:business-operations"), s("fam:data-analytics")],
  "Engineering Technology": [c("fam:manufacturing-automation"), s("fam:design-development"), s("fam:simulation-validation")],
  "Materials Engineering": [c("fam:engineering-rd"), s("fam:chemical-process"), s("fam:manufacturing-automation")],
  // Computing
  "Computer Science": [c("fam:software-engineering"), c("fam:data-analytics"), s("fam:security-it"), s("fam:product-management")],
  "Computer Engineering": [c("fam:electronics-hardware"), c("fam:software-engineering"), s("fam:data-analytics")],
  "Software Engineering": [c("fam:software-engineering"), s("fam:product-management")],
  "Data Science": [c("fam:data-analytics"), s("fam:software-engineering")],
  "Cybersecurity Engineering": [c("fam:security-it"), s("fam:software-engineering")],
  Cybersecurity: [c("fam:security-it"), s("fam:software-engineering")],
  "Information Technology": [c("fam:security-it"), s("fam:business-operations")],
  "Information Systems": [c("fam:security-it"), s("fam:business-operations"), s("fam:data-analytics")],
  // Business & economics
  Finance: [c("fam:finance"), s("fam:data-analytics")],
  Accounting: [c("fam:finance")],
  "Business Administration": [c("fam:business-operations"), s("fam:finance"), s("fam:marketing"), s("fam:product-management")],
  Management: [c("fam:business-operations"), s("fam:product-management")],
  Marketing: [c("fam:marketing"), s("fam:product-management")],
  "Supply Chain Management": [c("fam:business-operations"), s("fam:data-analytics")],
  Economics: [c("fam:finance"), c("fam:data-analytics"), s("fam:business-operations")],
  "Actuarial Science": [c("fam:finance"), c("fam:data-analytics")],
  // Healthcare & science
  Nursing: [c("fam:clinical-care"), s("fam:health-administration")],
  "Health Administration": [c("fam:health-administration")],
  "Public Health": [c("fam:health-administration"), s("fam:laboratory-science")],
  Biology: [c("fam:laboratory-science"), s("fam:environmental"), s("fam:clinical-care")],
  Chemistry: [c("fam:laboratory-science"), s("fam:chemical-process")],
  Biochemistry: [c("fam:laboratory-science")],
  Physics: [c("fam:engineering-rd"), s("fam:data-analytics")],
  "Environmental Science": [c("fam:environmental")],
  // Math
  Mathematics: [c("fam:data-analytics"), s("fam:finance")],
  "Applied Mathematics": [c("fam:data-analytics"), s("fam:finance")],
  Statistics: [c("fam:data-analytics"), s("fam:finance")],
  // Education, communication, design
  "Secondary Education": [c("fam:teaching-advising")],
  "Elementary Education": [c("fam:teaching-advising")],
  Psychology: [c("fam:teaching-advising"), s("fam:laboratory-science")],
  English: [c("fam:writing-communication"), s("fam:teaching-advising")],
  Journalism: [c("fam:writing-communication"), s("fam:marketing")],
  Communication: [c("fam:writing-communication"), s("fam:marketing")],
  "Graphic Design": [c("fam:industrial-design"), s("fam:marketing")],
};
