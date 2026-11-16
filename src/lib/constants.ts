// Exact extra domains, matched in full. Any address whose domain ends in .edu
// is allowed separately. This list is for domains that should pass even when
// they are not .edu. mail.uc.edu is already covered by .edu and stays here so
// the original student domain remains explicit.
export const ALLOWED_EMAIL_DOMAINS = ["mail.uc.edu"];

export const DATA_SOURCE = "early" as const;

export const ROUTES = {
  landing: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  notEligible: "/not-eligible",
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
} as const;

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
