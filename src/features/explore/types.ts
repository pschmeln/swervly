export const PROTOTYPE_BANNER =
  "Prototype — sample content, not real student activity";

export type ExploreProfile = {
  majorLabel: string;
  goalLabel: string;
  note: string;
};

export type ExploreDirection = {
  headline: string;
  note: string;
  needsQuiz: boolean;
};

export type CareerPath = {
  id: string;
  title: string;
  summary: string;
  sourceLabel: string | null;
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

export const SAMPLE_EXPERIENCES_LABEL = "Sample student experiences";
export const DEMO_DISCUSSIONS_LABEL = "Demo discussions";
export const DEMO_FOUNDER_LABEL = "Demonstration founder actions";

export type ExploreModel = {
  profile: ExploreProfile;
  direction: ExploreDirection;
  paths: CareerPath[];
  pathsIntro: string;
  pathsEmpty: string | null;
  experiences: SampleExperience[];
  questions: LocalQuestion[];
  scopes: ScopeOption[];
  companyRoles: string[];
  companies: CompanyCardModel[];
  reports: FounderReport[];
};
