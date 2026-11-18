import type { CareerLinkId } from "@/features/explore/links";

export const DIRECTORY_WHY_SHOWN = "Included in this directory of official careers pages.";

export type CatalogCompany = {
  id: string;
  name: string;
  field: string;
  roleCategories: readonly string[];
  whyShown: string;
  /** Null when no official careers page is on file. */
  careerLinkId: CareerLinkId | null;
};

/**
 * Verified organizations plus one invented empty card.
 * Relevance text is editorial sample copy. It is not a score and it does not
 * read a major catalog.
 */
export const CATALOG_COMPANIES: readonly CatalogCompany[] = [
  {
    id: "cchmc",
    name: "Cincinnati Children's",
    field: "Pediatric healthcare",
    roleCategories: ["Clinical operations"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "cchmc",
  },
  {
    id: "mayo",
    name: "Mayo Clinic",
    field: "Healthcare",
    roleCategories: ["Clinical operations"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "mayo",
  },
  {
    id: "tfa",
    name: "Teach For America",
    field: "Education",
    roleCategories: ["Community programs"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "tfa",
  },
  {
    id: "tnc",
    name: "The Nature Conservancy",
    field: "Environmental nonprofit",
    roleCategories: ["Public environmental work"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "tnc",
  },
  {
    id: "epa",
    name: "U.S. Environmental Protection Agency",
    field: "Environmental protection",
    roleCategories: ["Public environmental work"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "epa",
  },
  {
    id: "pg",
    name: "Procter & Gamble",
    field: "Consumer products",
    roleCategories: ["Business operations"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "pg",
  },
  {
    id: "kroger",
    name: "Kroger",
    field: "Grocery retail",
    roleCategories: ["Business operations"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "kroger",
  },
  {
    id: "deloitte",
    name: "Deloitte",
    field: "Consulting",
    roleCategories: ["Consulting"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "deloitte",
  },
  {
    id: "pnc",
    name: "PNC",
    field: "Banking",
    roleCategories: ["Finance"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "pnc",
  },
  {
    id: "cleveland-fed",
    name: "Federal Reserve Bank of Cleveland",
    field: "Public finance",
    roleCategories: ["Finance"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "cleveland-fed",
  },
  {
    id: "ideo",
    name: "IDEO",
    field: "Design",
    roleCategories: ["Product design"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "ideo",
  },
  {
    id: "ge-aerospace",
    name: "GE Aerospace",
    field: "Aerospace manufacturing",
    roleCategories: ["Manufacturing"],
    whyShown: DIRECTORY_WHY_SHOWN,
    careerLinkId: "ge-aerospace",
  },
  {
    id: "sample-empty",
    name: "Sample Org With No Page On File",
    field: "Placeholder",
    roleCategories: ["No category on file"],
    whyShown: "Included so this screen can show a company with no link and no experiences. It is an invented placeholder.",
    careerLinkId: null,
  },
];
