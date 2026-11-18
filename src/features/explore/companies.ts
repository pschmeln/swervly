import type { CareerLinkId } from "@/features/explore/links";

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
    whyShown: "Included because the sample profile lists clinical operations.",
    careerLinkId: "cchmc",
  },
  {
    id: "mayo",
    name: "Mayo Clinic",
    field: "Healthcare",
    roleCategories: ["Clinical operations"],
    whyShown: "Included because the sample profile lists clinical operations.",
    careerLinkId: "mayo",
  },
  {
    id: "tfa",
    name: "Teach For America",
    field: "Education",
    roleCategories: ["Community programs"],
    whyShown: "Included because the sample profile lists community programs.",
    careerLinkId: "tfa",
  },
  {
    id: "tnc",
    name: "The Nature Conservancy",
    field: "Environmental nonprofit",
    roleCategories: ["Public environmental work"],
    whyShown: "Included in this sample set as a public environmental example.",
    careerLinkId: "tnc",
  },
  {
    id: "epa",
    name: "U.S. Environmental Protection Agency",
    field: "Environmental protection",
    roleCategories: ["Public environmental work"],
    whyShown: "Included in this sample set as a public environmental example.",
    careerLinkId: "epa",
  },
  {
    id: "pg",
    name: "Procter & Gamble",
    field: "Consumer products",
    roleCategories: ["Business operations"],
    whyShown: "Included in this sample set as a business operations example.",
    careerLinkId: "pg",
  },
  {
    id: "kroger",
    name: "Kroger",
    field: "Grocery retail",
    roleCategories: ["Business operations"],
    whyShown: "Included in this sample set as a retail operations example.",
    careerLinkId: "kroger",
  },
  {
    id: "deloitte",
    name: "Deloitte",
    field: "Consulting",
    roleCategories: ["Consulting"],
    whyShown: "Included in this sample set as a consulting example.",
    careerLinkId: "deloitte",
  },
  {
    id: "pnc",
    name: "PNC",
    field: "Banking",
    roleCategories: ["Finance"],
    whyShown: "Included in this sample set as a banking example.",
    careerLinkId: "pnc",
  },
  {
    id: "cleveland-fed",
    name: "Federal Reserve Bank of Cleveland",
    field: "Public finance",
    roleCategories: ["Finance"],
    whyShown: "Included in this sample set as a public-finance example.",
    careerLinkId: "cleveland-fed",
  },
  {
    id: "ideo",
    name: "IDEO",
    field: "Design",
    roleCategories: ["Product design"],
    whyShown: "Included in this sample set as a design example.",
    careerLinkId: "ideo",
  },
  {
    id: "ge-aerospace",
    name: "GE Aerospace",
    field: "Aerospace manufacturing",
    roleCategories: ["Manufacturing"],
    whyShown: "Included in this sample set as a manufacturing example.",
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
