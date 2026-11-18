export const PROTOTYPE_BANNER =
  "Prototype — sample content, not real student activity";

export type ExploreProfile = {
  displayName: string;
  focus: string;
  goal: string;
};

export type ExploreDirection = {
  headline: string;
  note: string;
};

export type CareerPath = {
  id: string;
  title: string;
  summary: string;
};

export type SampleExperience = {
  id: string;
  companyName: string;
  role: string;
  authorLabel: string;
  body: string;
};

export type LocalAnswer = {
  id: string;
  authorLabel: string;
  body: string;
  sampleHelpfulCount: number;
  localOnly: boolean;
};

export type LocalQuestion = {
  id: string;
  scopeKind: "role" | "company";
  scopeId: string;
  scopeLabel: string;
  authorLabel: string;
  title: string;
  body: string;
  sampleHelpfulCount: number;
  localOnly: boolean;
  answers: LocalAnswer[];
};

export type ScopeOption = {
  value: string;
  label: string;
  shortLabel: string;
};

export type CompanyCardModel = {
  id: string;
  name: string;
  field: string;
  roleCategories: string[];
  whyShown: string;
  /** Shared sample experiences only. Zero means there is nothing to show. */
  experienceCount: number;
  careersUrl: string | null;
  linkCheckedOn: string | null;
};

export type FounderPreview = "hidden_on_screen" | "left_visible_on_screen";

export type FounderReport = {
  id: string;
  targetLabel: string;
  reason: string;
  preview: FounderPreview | null;
};

export type ExploreModel = {
  profile: ExploreProfile;
  direction: ExploreDirection;
  paths: CareerPath[];
  experiences: SampleExperience[];
  questions: LocalQuestion[];
  scopes: ScopeOption[];
  companyRoles: string[];
  companies: CompanyCardModel[];
  reports: FounderReport[];
};
