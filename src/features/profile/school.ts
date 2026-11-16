// Known registrable domains only. Parent labels are checked so mail.uc.edu
// resolves through uc.edu. Unknown universities stay blank for the student to type.
const SCHOOL_BY_DOMAIN: Readonly<Record<string, string>> = {
  "uc.edu": "University of Cincinnati",
};

function domainLabels(email: string): string[] {
  const normalized = email.trim().toLowerCase();
  const at = normalized.indexOf("@");
  if (at <= 0 || at !== normalized.lastIndexOf("@") || at === normalized.length - 1) {
    return [];
  }
  const domain = normalized.slice(at + 1);
  if (domain.length === 0 || /[\s@/\\]/.test(domain)) return [];
  return domain.split(".");
}

export function suggestSchoolFromEmail(email: string): string {
  const labels = domainLabels(email);
  if (labels.length < 2) return "";
  for (let start = 0; start < labels.length - 1; start += 1) {
    const school = SCHOOL_BY_DOMAIN[labels.slice(start).join(".")];
    if (school) return school;
  }
  return "";
}
