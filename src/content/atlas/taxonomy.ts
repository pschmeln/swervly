import type { ActivityTag, CareerDomain, CareerFamily, FamilyId, OccupationId, Specialization } from "@/features/atlas/types";

/**
 * Swervly's own grouping of careers. Everything in this file is editorial:
 * it is how Swervly chooses to arrange occupations for exploration, not a
 * sourced fact about any job. Summaries describe the kind of work only.
 * Founders review every line before it is shown to students.
 */

const domain = (id: CareerDomain["id"], title: string): CareerDomain => ({ id, title, provenance: "swervly_editorial" });

export const DOMAINS: readonly CareerDomain[] = [
  domain("dom:business", "Business and finance"),
  domain("dom:computing", "Computing and software"),
  domain("dom:education", "Education and people"),
  domain("dom:engineering", "Engineering and technology"),
  domain("dom:healthcare", "Healthcare"),
  domain("dom:media-design", "Media, writing and design"),
  domain("dom:science", "Science and research"),
  domain("dom:society", "Government, law and society"),
];

const family = (id: FamilyId, title: string, summary: string, domains: CareerFamily["domains"]): CareerFamily => ({
  id,
  title,
  summary,
  domains,
  provenance: "swervly_editorial",
});

export const FAMILIES: readonly CareerFamily[] = [
  family("fam:design-development", "Design and Development", "Turning requirements into physical products, parts and structures.", ["dom:engineering"]),
  family("fam:manufacturing-automation", "Manufacturing and Automation", "Making production lines work better, faster and more reliably.", ["dom:engineering"]),
  family("fam:simulation-validation", "Simulation and Validation", "Proving with models and tests that a design will work.", ["dom:engineering"]),
  family("fam:energy-thermal", "Energy and Thermal Systems", "Moving, converting and managing heat and energy.", ["dom:engineering"]),
  family("fam:engineering-rd", "Research and Development", "Investigating new materials, methods and technologies.", ["dom:engineering", "dom:science"]),
  family("fam:electronics-hardware", "Electronics and Hardware", "Designing circuits, chips, boards and the systems built from them.", ["dom:engineering", "dom:computing"]),
  family("fam:construction-field", "Construction and Field Engineering", "Planning and delivering structures and infrastructure on site.", ["dom:engineering"]),
  family("fam:chemical-process", "Chemical and Process Engineering", "Designing and running processes that transform materials.", ["dom:engineering", "dom:science"]),
  family("fam:software-engineering", "Software Engineering", "Building and maintaining software products and systems.", ["dom:computing"]),
  family("fam:data-analytics", "Data and Analytics", "Turning data into decisions with statistics and models.", ["dom:computing", "dom:business"]),
  family("fam:security-it", "Security and IT Systems", "Keeping an organization's systems working and protected.", ["dom:computing"]),
  family("fam:product-management", "Product Management", "Deciding what a product should do and coordinating who builds it.", ["dom:computing", "dom:business"]),
  family("fam:finance", "Finance", "Analyzing money, investments, risk and financial records.", ["dom:business"]),
  family("fam:business-operations", "Business Operations", "Running and improving how an organization works day to day.", ["dom:business"]),
  family("fam:marketing", "Marketing", "Understanding customers and how to reach them.", ["dom:business", "dom:media-design"]),
  family("fam:clinical-care", "Clinical Care", "Caring directly for patients.", ["dom:healthcare"]),
  family("fam:health-administration", "Health Administration", "Running the services and systems around patient care.", ["dom:healthcare", "dom:business"]),
  family("fam:laboratory-science", "Laboratory Science", "Running experiments and studies in a lab or clinic.", ["dom:science", "dom:healthcare"]),
  family("fam:environmental", "Environment and Sustainability", "Measuring and protecting air, water, land and health.", ["dom:science", "dom:engineering"]),
  family("fam:teaching-advising", "Teaching and Advising", "Helping people learn and choose their path.", ["dom:education"]),
  family("fam:writing-communication", "Writing and Communication", "Explaining complex things clearly to an audience.", ["dom:media-design"]),
  family("fam:industrial-design", "Industrial and Product Design", "Shaping how products look, feel and get used.", ["dom:media-design", "dom:engineering"]),
  // Coverage batch 1 (Nov 19, 2026)
  family("fam:social-science", "Social Science and Policy", "Studying how people, communities and governments work, and what changes them.", ["dom:society", "dom:science"]),
  family("fam:law-justice", "Law and Justice", "Working inside the legal and justice systems.", ["dom:society"]),
  family("fam:social-services", "Social Work and Counseling", "Supporting people through hard times and connecting them to help.", ["dom:education", "dom:healthcare"]),
  family("fam:medicine-pharmacy", "Medicine and Pharmacy", "Diagnosing illness and deciding on treatment and medication.", ["dom:healthcare"]),
  family("fam:rehab-wellness", "Rehabilitation and Wellness", "Helping people move, recover, eat well and stay active.", ["dom:healthcare"]),
  family("fam:public-health", "Public and Community Health", "Preventing illness and improving health across whole communities.", ["dom:healthcare", "dom:science"]),
  family("fam:human-resources", "People and Talent (HR)", "Hiring, training and supporting an organization's people.", ["dom:business"]),
  family("fam:visual-performing-arts", "Visual and Performing Arts", "Creating visual design, art and music.", ["dom:media-design"]),
];

const occ = (code: string, primary = false) => ({ id: `occ:onet:${code}` as OccupationId, primary });

const spec = (
  id: Specialization["id"],
  title: string,
  summary: string,
  families: readonly FamilyId[],
  occupations: Specialization["occupations"],
  activities: readonly ActivityTag[],
  closestOnly?: true,
): Specialization => ({
  id,
  title,
  summary,
  families,
  occupations,
  activities,
  ...(closestOnly ? { closestOnly } : {}),
  provenance: "swervly_editorial",
});

// Nov 21, 2026 (D6): 182 related occupations were appended to the end of these occupation lists,
// each placed with the occupation that lists it as most closely related (20 moved by hand).
// Founders review the placements in the planning doc ATLAS_RELATED_REVIEW.md.
export const SPECIALIZATIONS: readonly Specialization[] = [
  // Engineering: design
  spec("spec:robotics-mech-design", "Robotics mechanical design", "Designing the mechanisms, frames and actuators of robots.", ["fam:design-development"], [occ("17-2199.08", true), occ("17-2199.05"), occ("17-2141.00")], ["build", "model"]),
  spec("spec:automotive-product-dev", "Automotive product development", "Designing and developing vehicle systems and components.", ["fam:design-development"], [occ("17-2141.02", true), occ("17-2141.00")], ["build", "test"]),
  spec("spec:medical-device-design", "Medical device design", "Designing devices used in diagnosis and treatment.", ["fam:design-development"], [occ("17-2031.00", true), occ("17-2141.00")], ["build", "test"]),
  spec("spec:aerospace-structures", "Aerospace structures", "Designing airframes and structures that are light and strong.", ["fam:design-development", "fam:simulation-validation"], [occ("17-2011.00", true), occ("17-3021.00"), occ("49-2091.00")], ["model", "build"]),
  spec("spec:civil-structures", "Structural and civil design", "Designing bridges, buildings and infrastructure.", ["fam:construction-field", "fam:design-development"], [occ("17-2051.00", true), occ("17-2051.01"), occ("17-3022.00")], ["model", "field"]),
  // Engineering: manufacturing
  spec("spec:manufacturing-process", "Manufacturing process optimization", "Improving how parts and products get made on the line.", ["fam:manufacturing-automation"], [occ("17-2112.03", true), occ("17-2112.00"), occ("11-3051.00"), occ("11-1021.00"), occ("11-3051.03"), occ("11-3051.04"), occ("17-3026.00")], ["organize", "build", "field"]),
  spec("spec:industrial-automation", "Industrial automation", "Automating production with controls, sensors and robots.", ["fam:manufacturing-automation"], [occ("17-2199.05", true), occ("17-2199.08"), occ("17-3024.00"), occ("17-3024.01")], ["build", "code"]),
  spec("spec:quality-engineering", "Quality engineering", "Setting up the checks that keep products within spec.", ["fam:manufacturing-automation", "fam:simulation-validation"], [occ("11-3051.01", true), occ("17-2112.02"), occ("19-4099.01")], ["test", "organize"]),
  spec("spec:engineering-management", "Engineering management", "Leading engineering teams and projects.", ["fam:business-operations", "fam:manufacturing-automation"], [occ("11-9041.00", true), occ("25-1032.00")], ["people", "organize"]),
  // Engineering: simulation and validation
  spec("spec:structural-simulation", "Structural simulation (CAE)", "Using computer models to predict stress, strain and failure.", ["fam:simulation-validation"], [occ("17-2141.00", true), occ("17-2011.00")], ["model", "data"]),
  spec("spec:cfd-simulation", "CFD simulation", "Modeling fluid flow and heat transfer with computation.", ["fam:simulation-validation", "fam:energy-thermal"], [occ("17-2141.00", true), occ("17-2011.00")], ["model", "data"]),
  spec("spec:test-validation", "Test and validation", "Planning and running tests that prove a design meets its requirements.", ["fam:simulation-validation"], [occ("17-2112.02", true), occ("17-3027.00")], ["test"]),
  // Engineering: energy, R&D, hardware, process
  spec("spec:thermal-management", "Thermal management", "Keeping machines and electronics at the right temperature.", ["fam:energy-thermal"], [occ("17-2141.00", true)], ["model", "build"]),
  spec("spec:energy-systems", "Energy systems", "Designing and improving how energy is produced and used.", ["fam:energy-thermal", "fam:environmental"], [occ("17-2199.03", true), occ("17-2141.01"), occ("11-9041.01"), occ("11-9199.10"), occ("17-2199.10"), occ("17-2199.11"), occ("47-4011.01")], ["model", "field"]),
  spec("spec:engineering-research", "Engineering research", "Research-track work that often leads to graduate school.", ["fam:engineering-rd"], [occ("17-2141.00", true), occ("17-2071.00"), occ("17-2131.00")], ["model", "data"]),
  spec("spec:materials", "Materials development", "Developing and testing materials with new properties.", ["fam:engineering-rd", "fam:chemical-process"], [occ("17-2131.00", true), occ("17-2199.09"), occ("17-3026.01"), occ("19-2032.00")], ["test", "model"]),
  spec("spec:circuit-hardware", "Circuit and hardware design", "Designing and testing circuits and electronic hardware.", ["fam:electronics-hardware"], [occ("17-2071.00", true), occ("17-2072.00"), occ("17-2061.00"), occ("17-3023.00"), occ("49-2094.00")], ["build", "test"]),
  spec("spec:embedded-systems", "Embedded systems", "Writing software that runs directly on hardware devices.", ["fam:electronics-hardware", "fam:software-engineering"], [occ("17-2061.00", true), occ("15-1252.00"), occ("17-2199.06")], ["code", "build"]),
  spec("spec:construction-management", "Construction management", "Running construction projects on site, on time and on budget.", ["fam:construction-field"], [occ("11-9021.00", true), occ("47-1011.00"), occ("47-1011.03"), occ("47-4011.00")], ["field", "people", "organize"]),
  spec("spec:chemical-process", "Chemical process engineering", "Designing and running plants that make chemicals and materials.", ["fam:chemical-process", "fam:manufacturing-automation"], [occ("17-2041.00", true)], ["model", "field"]),
  // Computing
  spec("spec:application-development", "Application development", "Building software products people use.", ["fam:software-engineering"], [occ("15-1252.00", true), occ("15-1253.00"), occ("15-1251.00"), occ("15-1299.08")], ["code"]),
  spec("spec:robotics-software", "Robotics software", "Writing the perception, planning and control software for robots.", ["fam:software-engineering"], [occ("15-1252.00", true), occ("17-2199.08")], ["code", "model"]),
  spec("spec:software-testing", "Software quality and testing", "Finding problems in software before users do.", ["fam:software-engineering"], [occ("15-1253.00", true)], ["test", "code"]),
  spec("spec:data-science", "Data science", "Building models that find patterns and make predictions from data.", ["fam:data-analytics"], [occ("15-2051.00", true), occ("15-2041.00"), occ("15-2021.00"), occ("15-2041.01"), occ("43-9111.00")], ["data", "code"]),
  spec("spec:operations-research", "Operations research", "Using math to improve schedules, logistics and decisions.", ["fam:data-analytics", "fam:business-operations"], [occ("15-2031.00", true), occ("13-1081.02"), occ("11-3061.00"), occ("11-3071.00"), occ("11-3071.04"), occ("13-1081.00"), occ("13-1081.01")], ["data", "model"]),
  spec("spec:cybersecurity", "Cybersecurity", "Protecting systems and data from attack.", ["fam:security-it"], [occ("15-1212.00", true), occ("15-1244.00"), occ("15-1299.04"), occ("15-1299.05")], ["code", "test"]),
  spec("spec:systems-analysis", "IT systems analysis", "Matching an organization's needs to the systems it runs.", ["fam:security-it", "fam:business-operations"], [occ("15-1211.00", true), occ("15-1242.00"), occ("15-1243.00")], ["organize", "people"]),
  spec("spec:tech-product-management", "Product management (tech)", "Deciding what a software product should do next. No official occupation matches this well.", ["fam:product-management"], [occ("11-3021.00", true), occ("13-1082.00"), occ("15-1299.09")], ["people", "organize"], true),
  // Business
  spec("spec:investment-analysis", "Investment analysis", "Evaluating companies and investments.", ["fam:finance"], [occ("13-2051.00", true), occ("13-2052.00"), occ("11-3031.03"), occ("13-2071.00"), occ("41-3031.00")], ["data", "people"]),
  spec("spec:risk-quant", "Risk and quantitative finance", "Measuring financial risk with statistics and models.", ["fam:finance", "fam:data-analytics"], [occ("13-2054.00", true), occ("15-2041.00"), occ("13-2099.01")], ["data", "model"]),
  spec("spec:accounting", "Accounting and audit", "Keeping and checking financial records.", ["fam:finance"], [occ("13-2011.00", true), occ("11-3031.00"), occ("11-3031.01"), occ("13-2061.00"), occ("13-2082.00"), occ("43-3031.00")], ["organize", "data"]),
  spec("spec:consulting-strategy", "Consulting and strategy", "Helping organizations solve business problems.", ["fam:business-operations"], [occ("13-1111.00", true), occ("13-1082.00"), occ("11-3012.00")], ["people", "organize"]),
  spec("spec:market-research", "Market research", "Studying customers and markets.", ["fam:marketing"], [occ("13-1161.00", true), occ("13-1161.01"), occ("15-2051.01")], ["data", "people"]),
  // Healthcare and science
  spec("spec:clinical-nursing", "Clinical nursing", "Hands-on patient care in hospitals and clinics.", ["fam:clinical-care"], [occ("29-1141.00", true), occ("29-1141.01"), occ("29-1141.03"), occ("29-2043.00"), occ("29-2061.00")], ["people", "field"]),
  spec("spec:advanced-practice-nursing", "Advanced practice nursing", "Diagnosing and treating patients after graduate nursing study.", ["fam:clinical-care"], [occ("29-1171.00", true), occ("29-1141.02"), occ("29-1141.04")], ["people"]),
  spec("spec:health-services-management", "Health services management", "Running departments, clinics and health information systems.", ["fam:health-administration"], [occ("11-9111.00", true), occ("15-1211.01"), occ("25-1071.00"), occ("29-9021.00")], ["organize", "people"]),
  spec("spec:clinical-research", "Clinical research", "Coordinating studies that test treatments with patients.", ["fam:laboratory-science", "fam:health-administration"], [occ("11-9121.01", true), occ("19-1042.00"), occ("15-2051.02")], ["organize", "data"]),
  spec("spec:lab-research", "Laboratory research", "Running experiments in chemistry and the life sciences.", ["fam:laboratory-science"], [occ("19-2031.00", true), occ("19-1021.00"), occ("19-1042.00"), occ("11-9121.00"), occ("19-1022.00"), occ("19-1029.01"), occ("19-1029.02"), occ("19-1029.03"), occ("19-4021.00"), occ("29-2011.00"), occ("29-2012.00")], ["test", "data"]),
  spec("spec:environmental-science", "Environmental science", "Measuring pollution and its effects in the field and lab.", ["fam:environmental"], [occ("19-2041.00", true), occ("17-2081.00"), occ("11-9199.11"), occ("13-1041.01"), occ("17-2051.02"), occ("17-3025.00"), occ("19-4042.00")], ["field", "data"]),
  // Education and media
  spec("spec:secondary-teaching", "Secondary teaching", "Teaching a subject to high school students.", ["fam:teaching-advising"], [occ("25-2031.00", true), occ("25-3041.00")], ["people"]),
  spec("spec:career-advising", "Academic and career advising", "Helping students plan school and work.", ["fam:teaching-advising"], [occ("21-1012.00", true)], ["people"]),
  spec("spec:technical-writing", "Technical writing", "Writing manuals and documentation for technical products.", ["fam:writing-communication"], [occ("27-3042.00", true), occ("15-1299.03")], ["organize"]),
  spec("spec:product-design", "Industrial product design", "Designing the form and use of manufactured products.", ["fam:industrial-design", "fam:design-development"], [occ("27-1021.00", true), occ("17-3013.00"), occ("27-1022.00"), occ("51-4061.00"), occ("51-4062.00"), occ("51-6092.00")], ["build", "people"]),
  // Coverage batch 1 (Nov 19, 2026). Social science and policy
  spec("spec:policy-analysis", "Policy analysis and planning", "Studying government, economies and places, and proposing what should change.", ["fam:social-science"], [occ("19-3094.00", true), occ("19-3011.00"), occ("19-3051.00"), occ("11-1011.03"), occ("11-1031.00"), occ("13-1199.05"), occ("19-3011.01"), occ("19-3099.01"), occ("25-1011.00"), occ("25-1063.00"), occ("25-1065.00"), occ("25-1112.00")], ["data", "model"]),
  spec("spec:social-research", "Social research", "Studying how people and groups behave, through surveys, interviews and fieldwork.", ["fam:social-science", "fam:data-analytics"], [occ("19-3041.00", true), occ("19-3022.00"), occ("19-3091.00"), occ("19-3092.00"), occ("19-4061.00"), occ("25-1061.00"), occ("25-1062.00"), occ("25-1067.00"), occ("25-1113.00")], ["data", "people"]),
  spec("spec:history-heritage", "History, museums and libraries", "Researching, preserving and sharing records and collections.", ["fam:social-science", "fam:teaching-advising"], [occ("19-3093.00", true), occ("25-4012.00"), occ("25-4022.00"), occ("25-1082.00"), occ("25-1125.00"), occ("25-4011.00"), occ("25-4013.00"), occ("25-4031.00"), occ("43-4121.00")], ["organize", "people"]),
  // Law and justice
  spec("spec:legal-practice", "Legal practice", "Advising clients and preparing cases. Lawyers need law school after college.", ["fam:law-justice"], [occ("23-1011.00", true), occ("23-2011.00"), occ("23-1012.00"), occ("23-1021.00"), occ("23-1022.00"), occ("23-1023.00"), occ("23-2093.00"), occ("27-3092.00"), occ("43-4031.00"), occ("43-6012.00"), occ("43-6014.00")], ["people", "organize"]),
  spec("spec:investigation-forensics", "Investigation and forensics", "Gathering and analyzing evidence about what happened.", ["fam:law-justice", "fam:laboratory-science"], [occ("33-3021.00", true), occ("19-4092.00"), occ("13-1041.06"), occ("15-1299.06"), occ("33-1012.00"), occ("33-3021.02"), occ("33-3021.06"), occ("33-3051.00"), occ("33-9021.00")], ["field", "test"]),
  spec("spec:corrections-probation", "Probation and corrections", "Supervising and supporting people in the justice system.", ["fam:law-justice", "fam:social-services"], [occ("21-1092.00", true), occ("33-1011.00"), occ("33-3012.00")], ["people", "field"]),
  // Social work and counseling
  spec("spec:social-work", "Social work", "Helping children, families and patients get support and services.", ["fam:social-services"], [occ("21-1021.00", true), occ("21-1022.00"), occ("21-1023.00"), occ("11-9151.00"), occ("21-1093.00"), occ("43-4061.00")], ["people", "field"]),
  spec("spec:counseling", "Counseling", "Working one-on-one with people through addiction, disability or other challenges.", ["fam:social-services"], [occ("21-1011.00", true), occ("21-1015.00"), occ("21-1014.00")], ["people"]),
  spec("spec:psychology-practice", "Psychology practice", "Assessing and treating mental health, usually after graduate study.", ["fam:social-services", "fam:clinical-care"], [occ("19-3033.00", true), occ("19-3034.00"), occ("21-1013.00"), occ("29-1223.00")], ["people", "data"]),
  // Medicine and pharmacy
  spec("spec:physician", "Physician practice", "Diagnosing and treating patients. Requires medical school and residency.", ["fam:medicine-pharmacy", "fam:clinical-care"], [occ("29-1215.00", true), occ("29-1216.00"), occ("29-1212.00"), occ("29-1214.00"), occ("29-1218.00"), occ("29-1221.00"), occ("29-1222.00"), occ("29-1243.00")], ["people", "model"]),
  spec("spec:physician-assistant", "Physician assistant", "Examining, diagnosing and treating patients on a physician-led team.", ["fam:medicine-pharmacy", "fam:clinical-care"], [occ("29-1071.00", true)], ["people"]),
  spec("spec:pharmacy", "Pharmacy", "Dispensing medications and advising patients and doctors on their use.", ["fam:medicine-pharmacy"], [occ("29-1051.00", true)], ["people", "test"]),
  // Rehabilitation and wellness
  spec("spec:physical-therapy", "Physical therapy", "Helping patients recover movement after injury or illness.", ["fam:rehab-wellness", "fam:clinical-care"], [occ("29-1123.00", true), occ("31-2021.00"), occ("31-2022.00")], ["people", "field"]),
  spec("spec:occupational-therapy", "Occupational therapy", "Helping patients manage daily tasks after injury, illness or disability.", ["fam:rehab-wellness", "fam:clinical-care"], [occ("29-1122.00", true), occ("29-1127.00"), occ("31-2011.00"), occ("31-2012.00"), occ("31-9099.01")], ["people"]),
  spec("spec:exercise-sport", "Exercise and sports medicine", "Using exercise to treat, prevent and recover from injury.", ["fam:rehab-wellness"], [occ("29-1128.00", true), occ("29-9091.00"), occ("29-1125.00"), occ("29-1229.04"), occ("29-1229.06"), occ("39-9031.00")], ["people", "test"]),
  spec("spec:nutrition", "Nutrition and dietetics", "Planning what people eat to treat illness or stay healthy.", ["fam:rehab-wellness", "fam:public-health"], [occ("29-1031.00", true), occ("29-2051.00")], ["people", "organize"]),
  // Public and community health
  spec("spec:epidemiology", "Epidemiology", "Tracking diseases and their causes across populations.", ["fam:public-health", "fam:data-analytics"], [occ("19-1041.00", true), occ("29-1229.05")], ["data", "model"]),
  spec("spec:community-health", "Community health and education", "Teaching communities about health and connecting them to care.", ["fam:public-health", "fam:social-services"], [occ("21-1091.00", true), occ("21-1094.00"), occ("25-1072.00")], ["people", "organize"]),
  // People and talent
  spec("spec:hr", "Human resources", "Recruiting, hiring and supporting employees.", ["fam:human-resources", "fam:business-operations"], [occ("13-1071.00", true), occ("11-3121.00"), occ("13-1041.03"), occ("13-1141.00"), occ("43-1011.00"), occ("43-4161.00")], ["people", "organize"]),
  spec("spec:training-development", "Training and instructional design", "Designing how employees or students learn.", ["fam:human-resources", "fam:teaching-advising"], [occ("13-1151.00", true), occ("25-9031.00"), occ("11-3131.00"), occ("19-3032.00"), occ("25-1081.00"), occ("25-2023.00")], ["people", "organize"]),
  // Teaching
  spec("spec:early-childhood", "Early childhood teaching", "Teaching preschool and kindergarten children.", ["fam:teaching-advising"], [occ("25-2011.00", true), occ("25-2012.00")], ["people"]),
  spec("spec:elementary-middle-teaching", "Elementary and middle school teaching", "Teaching children from first grade through middle school.", ["fam:teaching-advising"], [occ("25-2021.00", true), occ("25-2022.00"), occ("25-3011.00")], ["people", "organize"]),
  spec("spec:special-education", "Special education", "Teaching students with learning, emotional or physical disabilities.", ["fam:teaching-advising", "fam:social-services"], [occ("25-2056.00", true), occ("25-2051.00"), occ("25-2058.00"), occ("25-2055.00"), occ("25-2057.00"), occ("25-9043.00")], ["people"]),
  // Writing, media and marketing
  spec("spec:journalism", "Journalism", "Reporting and explaining news and events.", ["fam:writing-communication"], [occ("27-3023.00", true), occ("27-3011.00")], ["people", "field"]),
  spec("spec:writing-editing", "Writing and editing", "Writing, shaping and checking content for readers.", ["fam:writing-communication"], [occ("27-3043.00", true), occ("27-3041.00"), occ("25-1123.00"), occ("27-3043.05"), occ("27-4032.00"), occ("43-9081.00")], ["organize"]),
  spec("spec:translation", "Translation and interpreting", "Carrying meaning between languages, in writing or speech.", ["fam:writing-communication"], [occ("27-3091.00", true), occ("25-1124.00")], ["people"]),
  spec("spec:public-relations", "Public relations", "Shaping how an organization is seen by the public and the press.", ["fam:marketing", "fam:writing-communication"], [occ("27-3031.00", true), occ("11-2032.00")], ["people", "organize"]),
  spec("spec:marketing-management", "Marketing and advertising management", "Planning campaigns and deciding how a product is promoted.", ["fam:marketing"], [occ("11-2021.00", true), occ("11-2011.00"), occ("11-2022.00"), occ("41-3011.00")], ["people", "organize"]),
  // Visual and performing arts
  spec("spec:graphic-design", "Graphic and visual design", "Designing images, layouts and visual identities.", ["fam:visual-performing-arts", "fam:marketing"], [occ("27-1024.00", true), occ("27-1011.00"), occ("15-1255.00"), occ("27-1013.00"), occ("27-1014.00"), occ("27-2012.00"), occ("43-9031.00")], ["build", "people"]),
  spec("spec:music", "Music", "Performing, composing and directing music.", ["fam:visual-performing-arts"], [occ("27-2042.00", true), occ("27-2041.00"), occ("25-1121.00"), occ("27-2011.00"), occ("27-2012.04"), occ("27-2031.00"), occ("27-2032.00")], ["people", "build"]),
  // Environment
  spec("spec:geoscience", "Geoscience", "Studying rock, soil and water to find resources and manage hazards.", ["fam:environmental"], [occ("19-2042.00", true), occ("19-2043.00"), occ("11-9121.02"), occ("19-1013.00"), occ("19-1031.00"), occ("19-2041.03"), occ("19-4044.00")], ["field", "data"]),
];
