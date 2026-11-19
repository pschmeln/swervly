import type { Occupation } from "@/features/atlas/types";

/**
 * O*NET-SOC occupations used by the Career Atlas prototype.
 *
 * Only the code and the title are stored. Both were checked against the
 * "Browse by Job Family → All Job Families" list on O*NET OnLine
 * (https://www.onetonline.org/find/family?f=0) on 2026-11-18.
 * Descriptions, tasks and skills are NOT here yet: they come from the O*NET
 * database text files in a later step, never from memory or a model.
 *
 * Credit line required wherever these titles are shown:
 */
export const ONET_CREDIT =
  "Occupation titles and codes from O*NET OnLine by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET® is a trademark of USDOL/ETA.";

export const ONET_CHECKED_ON = "2026-11-18";

const row = (onetCode: string, title: string): Occupation => ({
  id: `occ:onet:${onetCode}`,
  onetCode,
  title,
  provenance: "onet",
});

export const OCCUPATIONS: readonly Occupation[] = [
  // Management
  row("11-3021.00", "Computer and Information Systems Managers"),
  row("11-3051.00", "Industrial Production Managers"),
  row("11-3051.01", "Quality Control Systems Managers"),
  row("11-9021.00", "Construction Managers"),
  row("11-9041.00", "Architectural and Engineering Managers"),
  row("11-9111.00", "Medical and Health Services Managers"),
  row("11-9121.00", "Natural Sciences Managers"),
  row("11-9121.01", "Clinical Research Coordinators"),
  // Business and financial operations
  row("13-1081.02", "Logistics Analysts"),
  row("13-1082.00", "Project Management Specialists"),
  row("13-1111.00", "Management Analysts"),
  row("13-1161.00", "Market Research Analysts and Marketing Specialists"),
  row("13-2011.00", "Accountants and Auditors"),
  row("13-2051.00", "Financial and Investment Analysts"),
  row("13-2052.00", "Personal Financial Advisors"),
  row("13-2054.00", "Financial Risk Specialists"),
  // Computer and mathematical
  row("15-1211.00", "Computer Systems Analysts"),
  row("15-1211.01", "Health Informatics Specialists"),
  row("15-1212.00", "Information Security Analysts"),
  row("15-1252.00", "Software Developers"),
  row("15-1253.00", "Software Quality Assurance Analysts and Testers"),
  row("15-2031.00", "Operations Research Analysts"),
  row("15-2041.00", "Statisticians"),
  row("15-2051.00", "Data Scientists"),
  // Architecture and engineering
  row("17-2011.00", "Aerospace Engineers"),
  row("17-2031.00", "Bioengineers and Biomedical Engineers"),
  row("17-2041.00", "Chemical Engineers"),
  row("17-2051.00", "Civil Engineers"),
  row("17-2061.00", "Computer Hardware Engineers"),
  row("17-2071.00", "Electrical Engineers"),
  row("17-2072.00", "Electronics Engineers, Except Computer"),
  row("17-2081.00", "Environmental Engineers"),
  row("17-2112.00", "Industrial Engineers"),
  row("17-2112.02", "Validation Engineers"),
  row("17-2112.03", "Manufacturing Engineers"),
  row("17-2131.00", "Materials Engineers"),
  row("17-2141.00", "Mechanical Engineers"),
  row("17-2141.01", "Fuel Cell Engineers"),
  row("17-2141.02", "Automotive Engineers"),
  row("17-2199.03", "Energy Engineers, Except Wind and Solar"),
  row("17-2199.05", "Mechatronics Engineers"),
  row("17-2199.08", "Robotics Engineers"),
  // Life, physical and social science
  row("19-1021.00", "Biochemists and Biophysicists"),
  row("19-1042.00", "Medical Scientists, Except Epidemiologists"),
  row("19-2031.00", "Chemists"),
  row("19-2041.00", "Environmental Scientists and Specialists, Including Health"),
  // Community, education, media
  row("21-1012.00", "Educational, Guidance, and Career Counselors and Advisors"),
  row("25-2031.00", "Secondary School Teachers, Except Special and Career/Technical Education"),
  row("27-1021.00", "Commercial and Industrial Designers"),
  row("27-3042.00", "Technical Writers"),
  // Healthcare practitioners
  row("29-1141.00", "Registered Nurses"),
  row("29-1141.01", "Acute Care Nurses"),
  row("29-1141.03", "Critical Care Nurses"),
  row("29-1171.00", "Nurse Practitioners"),
];
