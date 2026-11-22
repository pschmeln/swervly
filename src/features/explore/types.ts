import type { CompanyAverages } from "@/features/company/aggregate";
export type ExploreProfile = {
  majorLabel: string;
  goalLabel: string;
  note: string;
};

export type ExploreDirection = {
  headline: string;
  note: string;
  needsQuiz: boolean;
  /** Every suggestion was dismissed: offer Retake the quiz and Browse the career map. */
  exhausted?: boolean;
};

export type CareerPath = {
  id: string;
  title: string;
  summary: string;
  sourceLabel: string | null;
};

export type CompanyCardModel = {
  id: string;
  name: string;
  field: string;
  roleCategories: string[];
  whyShown: string;
  careersUrl: string | null;
  linkCheckedOn: string | null;
  /** "Headquartered within N miles of City, ST" when inside the student's area (item 3). */
  nearby?: string | null;
  /** Review averages for the viewer's major, or the all-majors fallback (item 4). */
  averages?: CompanyAverages | null;
  /** The company page with the full view. */
  reviewsHref?: string | null;
  /** False when the viewer has no catalog major (custom or undecided). */
  viewerHasMajor?: boolean;
};


export type ExploreModel = {
  profile: ExploreProfile;
  direction: ExploreDirection;
  paths: CareerPath[];
  pathsIntro: string;
  pathsEmpty: string | null;
  companyRoles: string[];
  companies: CompanyCardModel[];
};
