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

export const SPECIALIZATIONS: readonly Specialization[] = [
  // Engineering: design
  spec("spec:robotics-mech-design", "Robotics mechanical design", "Designing the mechanisms, frames and actuators of robots.", ["fam:design-development"], [occ("17-2199.08", true), occ("17-2199.05"), occ("17-2141.00")], ["build", "model"]),
  spec("spec:automotive-product-dev", "Automotive product development", "Designing and developing vehicle systems and components.", ["fam:design-development"], [occ("17-2141.02", true), occ("17-2141.00")], ["build", "test"]),
  spec("spec:medical-device-design", "Medical device design", "Designing devices used in diagnosis and treatment.", ["fam:design-development"], [occ("17-2031.00", true), occ("17-2141.00")], ["build", "test"]),
  spec("spec:aerospace-structures", "Aerospace structures", "Designing airframes and structures that are light and strong.", ["fam:design-development", "fam:simulation-validation"], [occ("17-2011.00", true)], ["model", "build"]),
  spec("spec:civil-structures", "Structural and civil design", "Designing bridges, buildings and infrastructure.", ["fam:construction-field", "fam:design-development"], [occ("17-2051.00", true)], ["model", "field"]),
  // Engineering: manufacturing
  spec("spec:manufacturing-process", "Manufacturing process optimization", "Improving how parts and products get made on the line.", ["fam:manufacturing-automation"], [occ("17-2112.03", true), occ("17-2112.00"), occ("11-3051.00")], ["organize", "build", "field"]),
  spec("spec:industrial-automation", "Industrial automation", "Automating production with controls, sensors and robots.", ["fam:manufacturing-automation"], [occ("17-2199.05", true), occ("17-2199.08")], ["build", "code"]),
  spec("spec:quality-engineering", "Quality engineering", "Setting up the checks that keep products within spec.", ["fam:manufacturing-automation", "fam:simulation-validation"], [occ("11-3051.01", true), occ("17-2112.02")], ["test", "organize"]),
  spec("spec:engineering-management", "Engineering management", "Leading engineering teams and projects.", ["fam:business-operations", "fam:manufacturing-automation"], [occ("11-9041.00", true)], ["people", "organize"]),
  // Engineering: simulation and validation
  spec("spec:structural-simulation", "Structural simulation (CAE)", "Using computer models to predict stress, strain and failure.", ["fam:simulation-validation"], [occ("17-2141.00", true), occ("17-2011.00")], ["model", "data"]),
  spec("spec:cfd-simulation", "CFD simulation", "Modeling fluid flow and heat transfer with computation.", ["fam:simulation-validation", "fam:energy-thermal"], [occ("17-2141.00", true), occ("17-2011.00")], ["model", "data"]),
  spec("spec:test-validation", "Test and validation", "Planning and running tests that prove a design meets its requirements.", ["fam:simulation-validation"], [occ("17-2112.02", true)], ["test"]),
  // Engineering: energy, R&D, hardware, process
  spec("spec:thermal-management", "Thermal management", "Keeping machines and electronics at the right temperature.", ["fam:energy-thermal"], [occ("17-2141.00", true)], ["model", "build"]),
  spec("spec:energy-systems", "Energy systems", "Designing and improving how energy is produced and used.", ["fam:energy-thermal", "fam:environmental"], [occ("17-2199.03", true), occ("17-2141.01")], ["model", "field"]),
  spec("spec:engineering-research", "Engineering research", "Research-track work that often leads to graduate school.", ["fam:engineering-rd"], [occ("17-2141.00", true), occ("17-2071.00"), occ("17-2131.00")], ["model", "data"]),
  spec("spec:materials", "Materials development", "Developing and testing materials with new properties.", ["fam:engineering-rd", "fam:chemical-process"], [occ("17-2131.00", true)], ["test", "model"]),
  spec("spec:circuit-hardware", "Circuit and hardware design", "Designing and testing circuits and electronic hardware.", ["fam:electronics-hardware"], [occ("17-2071.00", true), occ("17-2072.00"), occ("17-2061.00")], ["build", "test"]),
  spec("spec:embedded-systems", "Embedded systems", "Writing software that runs directly on hardware devices.", ["fam:electronics-hardware", "fam:software-engineering"], [occ("17-2061.00", true), occ("15-1252.00")], ["code", "build"]),
  spec("spec:construction-management", "Construction management", "Running construction projects on site, on time and on budget.", ["fam:construction-field"], [occ("11-9021.00", true)], ["field", "people", "organize"]),
  spec("spec:chemical-process", "Chemical process engineering", "Designing and running plants that make chemicals and materials.", ["fam:chemical-process", "fam:manufacturing-automation"], [occ("17-2041.00", true)], ["model", "field"]),
  // Computing
  spec("spec:application-development", "Application development", "Building software products people use.", ["fam:software-engineering"], [occ("15-1252.00", true), occ("15-1253.00")], ["code"]),
  spec("spec:robotics-software", "Robotics software", "Writing the perception, planning and control software for robots.", ["fam:software-engineering"], [occ("15-1252.00", true), occ("17-2199.08")], ["code", "model"]),
  spec("spec:software-testing", "Software quality and testing", "Finding problems in software before users do.", ["fam:software-engineering"], [occ("15-1253.00", true)], ["test", "code"]),
  spec("spec:data-science", "Data science", "Building models that find patterns and make predictions from data.", ["fam:data-analytics"], [occ("15-2051.00", true), occ("15-2041.00")], ["data", "code"]),
  spec("spec:operations-research", "Operations research", "Using math to improve schedules, logistics and decisions.", ["fam:data-analytics", "fam:business-operations"], [occ("15-2031.00", true), occ("13-1081.02")], ["data", "model"]),
  spec("spec:cybersecurity", "Cybersecurity", "Protecting systems and data from attack.", ["fam:security-it"], [occ("15-1212.00", true)], ["code", "test"]),
  spec("spec:systems-analysis", "IT systems analysis", "Matching an organization's needs to the systems it runs.", ["fam:security-it", "fam:business-operations"], [occ("15-1211.00", true)], ["organize", "people"]),
  spec("spec:tech-product-management", "Product management (tech)", "Deciding what a software product should do next. No official occupation matches this well.", ["fam:product-management"], [occ("11-3021.00", true), occ("13-1082.00")], ["people", "organize"], true),
  // Business
  spec("spec:investment-analysis", "Investment analysis", "Evaluating companies and investments.", ["fam:finance"], [occ("13-2051.00", true), occ("13-2052.00")], ["data", "people"]),
  spec("spec:risk-quant", "Risk and quantitative finance", "Measuring financial risk with statistics and models.", ["fam:finance", "fam:data-analytics"], [occ("13-2054.00", true), occ("15-2041.00")], ["data", "model"]),
  spec("spec:accounting", "Accounting and audit", "Keeping and checking financial records.", ["fam:finance"], [occ("13-2011.00", true)], ["organize", "data"]),
  spec("spec:consulting-strategy", "Consulting and strategy", "Helping organizations solve business problems.", ["fam:business-operations"], [occ("13-1111.00", true), occ("13-1082.00")], ["people", "organize"]),
  spec("spec:market-research", "Market research", "Studying customers and markets.", ["fam:marketing"], [occ("13-1161.00", true)], ["data", "people"]),
  // Healthcare and science
  spec("spec:clinical-nursing", "Clinical nursing", "Hands-on patient care in hospitals and clinics.", ["fam:clinical-care"], [occ("29-1141.00", true), occ("29-1141.01"), occ("29-1141.03")], ["people", "field"]),
  spec("spec:advanced-practice-nursing", "Advanced practice nursing", "Diagnosing and treating patients after graduate nursing study.", ["fam:clinical-care"], [occ("29-1171.00", true)], ["people"]),
  spec("spec:health-services-management", "Health services management", "Running departments, clinics and health information systems.", ["fam:health-administration"], [occ("11-9111.00", true), occ("15-1211.01")], ["organize", "people"]),
  spec("spec:clinical-research", "Clinical research", "Coordinating studies that test treatments with patients.", ["fam:laboratory-science", "fam:health-administration"], [occ("11-9121.01", true), occ("19-1042.00")], ["organize", "data"]),
  spec("spec:lab-research", "Laboratory research", "Running experiments in chemistry and the life sciences.", ["fam:laboratory-science"], [occ("19-2031.00", true), occ("19-1021.00"), occ("19-1042.00"), occ("11-9121.00")], ["test", "data"]),
  spec("spec:environmental-science", "Environmental science", "Measuring pollution and its effects in the field and lab.", ["fam:environmental"], [occ("19-2041.00", true), occ("17-2081.00")], ["field", "data"]),
  // Education and media
  spec("spec:secondary-teaching", "Secondary teaching", "Teaching a subject to high school students.", ["fam:teaching-advising"], [occ("25-2031.00", true)], ["people"]),
  spec("spec:career-advising", "Academic and career advising", "Helping students plan school and work.", ["fam:teaching-advising"], [occ("21-1012.00", true)], ["people"]),
  spec("spec:technical-writing", "Technical writing", "Writing manuals and documentation for technical products.", ["fam:writing-communication"], [occ("27-3042.00", true)], ["organize"]),
  spec("spec:product-design", "Industrial product design", "Designing the form and use of manufactured products.", ["fam:industrial-design", "fam:design-development"], [occ("27-1021.00", true)], ["build", "people"]),
];
