// Exact extra domains, matched in full. Any address whose domain ends in .edu
// is allowed separately. This list is for domains that should pass even when
// they are not .edu. mail.uc.edu is already covered by .edu and stays here so
// the original student domain remains explicit.
export const ALLOWED_EMAIL_DOMAINS = ["mail.uc.edu"];

export const DATA_SOURCE = "early" as const;

export const EMAIL_CONFLICT_MESSAGE =
  "This email already has a Swervly account tied to a different sign-in.";

/** Most co-ops or internships one student can log. Must match rotations_number_range in src/db/schema.ts. */
export const MAX_ROTATIONS = 8;

export const ROUTES = {
  landing: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  notEligible: "/not-eligible",
  accountConflict: "/account-conflict",
  home: "/home",
  me: "/api/me",
  onboarding: "/onboarding",
  profile: "/profile",
  settings: "/settings",
  profileUpdate: "/api/profile",
  assessment: "/api/assessment",
  accountExport: "/api/account/export",
  account: "/api/account",
  reviews: "/reviews",
  reviewsNew: "/reviews/new",
  reviewEdit: "/reviews/[id]/edit",
  employers: "/api/employers",
  rotations: "/api/rotations",
  rotation: "/api/rotations/[id]",
  privacy: "/privacy",
  privacyUpdate: "/privacy-update",
  privacyAgree: "/api/privacy/agree",
  direction: "/direction",
  directionDismiss: "/api/direction/dismiss",
  directionInterest: "/api/direction/interest",
  directionExplore: "/direction/explore",
  community: "/community",
  communityPost: "/community/posts/[id]",
  communityTerms: "/api/community/terms",
  communityPosts: "/api/community/posts",
  communityArchetypeShare: "/api/community/archetype",
  communityPostApi: "/api/community/posts/[id]",
  communityPostComments: "/api/community/posts/[id]/comments",
  communityReviewComments: "/api/community/reviews/[id]/comments",
  communityCommentApi: "/api/community/comments/[id]",
  communityHelpful: "/api/community/helpful",
  communityReports: "/api/community/reports",
  directionAtlas: "/direction/atlas",
  atlasMarks: "/api/atlas/marks",
  atlasAnswers: "/api/atlas/answers",
  actionPlan: "/api/action/plan",
  actionPlanRevise: "/api/action/plan/revise",
  actionTasks: "/api/action/tasks",
  actionTask: "/api/action/tasks/[id]",
  actionSkill: "/api/action/skills/[id]",
  feedback: "/feedback",
  feedbackApi: "/api/feedback",
  company: "/companies/[id]",
  companyPreview: "/api/companies/preview",
  skills: "/api/skills",
  places: "/api/places",
  founders: "/founders",
  foundersApi: "/api/founders",
  foundersCommunityApi: "/api/founders/community",
  foundersAdvisorsApi: "/api/founders/advisors",
  advisors: "/advisors",
  advisorRequest: "/api/advisors/request",
  password: "/api/account/password",
  preferences: "/api/account/preferences",
  invite: "/invite/[userId]",
} as const;

// Legacy onboarding enum. The searchable catalog lives in src/features/majors/catalog.ts.
// Profile writes use that catalog. This list stays so older ProfileInput checks still parse.
export const MAJORS = [
  "Aerospace Engineering",
  "Architectural Engineering",
  "Biomedical Engineering",
  "Chemical Engineering",
  "Civil Engineering",
  "Computer Engineering",
  "Computer Science",
  "Construction Management",
  "Cybersecurity Engineering",
  "Electrical Engineering",
  "Environmental Engineering",
  "Industrial & Systems Engineering",
  "Mechanical Engineering",
  "Engineering Technology",
  "Other",
] as const;
