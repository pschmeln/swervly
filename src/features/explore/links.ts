import { CAREER_LINK_CHECKS } from "@/content/career-link-checks";
import { COMPANIES } from "@/content/companies";
import { ageInDays, CHECK_MAX_AGE_DAYS, CHECK_METHOD, hostMatches } from "@/features/companies/link-check";

/**
 * Official careers URLs that passed a check (src/content/career-link-checks.ts,
 * written by scripts/check-career-links.ts). careerPageHref accepts only these exact
 * final URLs, and only while the check is at most CHECK_MAX_AGE_DAYS old. It is not a crawler.
 */
export const CAREER_LINK_CHECK_METHOD = CHECK_METHOD;

export type VerifiedCareerLink = {
  /** The company id in src/content/companies.ts. */
  id: string;
  organization: string;
  requestedUrl: string;
  finalUrl: string;
  finalHost: string;
  hostSuffix: string;
  httpStatus: 200;
  checkedOn: string;
};

const COMPANY_BY_ID = new Map(COMPANIES.map((company) => [company.id, company]));

/** Every accepted check whose company is still on file with the same careers domain. */
export const VERIFIED_CAREER_LINKS: readonly VerifiedCareerLink[] = CAREER_LINK_CHECKS.flatMap((check) => {
  const company = COMPANY_BY_ID.get(check.companyId);
  if (!check.accepted || !company?.careers || !check.finalUrl || !check.finalHost || check.httpStatus !== 200) return [];
  if (!hostMatches(check.finalHost, company.careers.hostSuffix)) return [];
  return [{
    id: company.id,
    organization: company.name,
    requestedUrl: check.requestedUrl,
    finalUrl: check.finalUrl,
    finalHost: check.finalHost,
    hostSuffix: company.careers.hostSuffix,
    httpStatus: 200 as const,
    checkedOn: check.checkedOn,
  }];
});

export type CareerLinkId = string;

const LINK_BY_ID = new Map(VERIFIED_CAREER_LINKS.map((link) => [link.id, link]));
const LINK_BY_URL = new Map(VERIFIED_CAREER_LINKS.map((link) => [link.finalUrl, link]));

export function careerLinkById(id: CareerLinkId): VerifiedCareerLink {
  const link = LINK_BY_ID.get(id);
  if (!link) {
    throw new Error("Unknown careers link.");
  }
  return link;
}

/** True when the company has an accepted careers check on file. */
export function hasCareerLink(id: string): boolean {
  return LINK_BY_ID.has(id);
}

/**
 * Returns the verified https URL, or null when the input is not on the list or its
 * check is older than CHECK_MAX_AGE_DAYS (pass `today` in tests).
 */
export function careerPageHref(input: string, today: Date = new Date()): string | null {
  if (typeof input !== "string" || input.length === 0 || input !== input.trim()) return null;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  const link = LINK_BY_URL.get(input);
  if (!link) return null;
  if (url.host !== link.finalHost) return null;
  if (!hostMatches(url.host, link.hostSuffix)) return null;
  if (ageInDays(link.checkedOn, today) > CHECK_MAX_AGE_DAYS) return null;
  return link.finalUrl;
}
