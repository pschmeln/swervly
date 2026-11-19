import { ONET_RELEASE } from "@/content/atlas/onet-details";
import type { Occupation } from "@/features/atlas/types";

/**
 * O*NET-SOC occupations used by the Career Atlas prototype.
 *
 * Codes and titles were checked against O*NET OnLine on 2026-11-18 and match
 * the O*NET database release in ONET_RELEASE exactly. Descriptions, tasks and software come from
 * the database files via scripts/atlas-import-onet.ts (src/content/atlas/onet-details.ts),
 * never from memory or a model.
 *
 * Credit line required wherever O*NET content is shown. Swervly selects a
 * subset of tasks and software, so the line says the content was adapted.
 */
export const ONET_CREDIT =
  `Occupation information from the O*NET ${ONET_RELEASE} Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license; Swervly selected which tasks and software to show. O*NET® is a trademark of USDOL/ETA.`;

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
  // Life, physical and social science (batch 1)
  row("19-1041.00", "Epidemiologists"),
  row("19-2042.00", "Geoscientists, Except Hydrologists and Geographers"),
  row("19-2043.00", "Hydrologists"),
  row("19-3011.00", "Economists"),
  row("19-3022.00", "Survey Researchers"),
  row("19-3033.00", "Clinical and Counseling Psychologists"),
  row("19-3034.00", "School Psychologists"),
  row("19-3041.00", "Sociologists"),
  row("19-3051.00", "Urban and Regional Planners"),
  row("19-3091.00", "Anthropologists and Archeologists"),
  row("19-3093.00", "Historians"),
  row("19-3094.00", "Political Scientists"),
  row("19-4092.00", "Forensic Science Technicians"),
  // Management, business and HR (batch 1)
  row("11-2011.00", "Advertising and Promotions Managers"),
  row("11-2021.00", "Marketing Managers"),
  row("13-1071.00", "Human Resources Specialists"),
  row("13-1151.00", "Training and Development Specialists"),
  // Community and social service (batch 1)
  row("21-1011.00", "Substance Abuse and Behavioral Disorder Counselors"),
  row("21-1015.00", "Rehabilitation Counselors"),
  row("21-1021.00", "Child, Family, and School Social Workers"),
  row("21-1022.00", "Healthcare Social Workers"),
  row("21-1023.00", "Mental Health and Substance Abuse Social Workers"),
  row("21-1091.00", "Health Education Specialists"),
  row("21-1092.00", "Probation Officers and Correctional Treatment Specialists"),
  row("21-1094.00", "Community Health Workers"),
  // Legal and protective (batch 1)
  row("23-1011.00", "Lawyers"),
  row("23-2011.00", "Paralegals and Legal Assistants"),
  row("33-3021.00", "Detectives and Criminal Investigators"),
  // Education and library (batch 1)
  row("25-2011.00", "Preschool Teachers, Except Special Education"),
  row("25-2012.00", "Kindergarten Teachers, Except Special Education"),
  row("25-2021.00", "Elementary School Teachers, Except Special Education"),
  row("25-2022.00", "Middle School Teachers, Except Special and Career/Technical Education"),
  row("25-2051.00", "Special Education Teachers, Preschool"),
  row("25-2056.00", "Special Education Teachers, Elementary School"),
  row("25-2058.00", "Special Education Teachers, Secondary School"),
  row("25-4012.00", "Curators"),
  row("25-4022.00", "Librarians and Media Collections Specialists"),
  row("25-9031.00", "Instructional Coordinators"),
  // Arts, media and communication (batch 1)
  row("27-1011.00", "Art Directors"),
  row("27-1024.00", "Graphic Designers"),
  row("27-2041.00", "Music Directors and Composers"),
  row("27-2042.00", "Musicians and Singers"),
  row("27-3023.00", "News Analysts, Reporters, and Journalists"),
  row("27-3031.00", "Public Relations Specialists"),
  row("27-3041.00", "Editors"),
  row("27-3043.00", "Writers and Authors"),
  row("27-3091.00", "Interpreters and Translators"),
  // Healthcare practitioners (batch 1)
  row("29-1031.00", "Dietitians and Nutritionists"),
  row("29-1051.00", "Pharmacists"),
  row("29-1071.00", "Physician Assistants"),
  row("29-1122.00", "Occupational Therapists"),
  row("29-1123.00", "Physical Therapists"),
  row("29-1128.00", "Exercise Physiologists"),
  row("29-1215.00", "Family Medicine Physicians"),
  row("29-1216.00", "General Internal Medicine Physicians"),
  row("29-9091.00", "Athletic Trainers"),
];
