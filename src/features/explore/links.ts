/**
 * Official careers URLs checked once on 2026-11-17.
 * careerPageHref accepts only these exact final URLs. It is not a crawler.
 */
export const CAREER_LINK_CHECKED_ON = "2026-11-17";

export const CAREER_LINK_CHECK_METHOD =
  "One-time HTTP GET on 2026-11-17 from this workspace, with a browser User-Agent and redirects followed. A link is kept only when the final status is 200, the final host belongs to the organization, and the page title or text identifies a careers page. Nothing is scheduled to fetch these again.";

export type VerifiedCareerLink = {
  id: string;
  organization: string;
  requestedUrl: string;
  finalUrl: string;
  finalHost: string;
  hostSuffix: string;
  httpStatus: 200;
};

export const VERIFIED_CAREER_LINKS: readonly VerifiedCareerLink[] = [
  {
    id: "pg",
    organization: "Procter & Gamble",
    requestedUrl: "https://www.pgcareers.com/",
    finalUrl: "https://www.pgcareers.com/us/en",
    finalHost: "www.pgcareers.com",
    hostSuffix: "pgcareers.com",
    httpStatus: 200,
  },
  {
    id: "kroger",
    organization: "The Kroger Co.",
    requestedUrl: "https://jobs.kroger.com/",
    finalUrl: "https://www.krogerfamilycareers.com/en/sites/CX_2001",
    finalHost: "www.krogerfamilycareers.com",
    hostSuffix: "krogerfamilycareers.com",
    httpStatus: 200,
  },
  {
    id: "cchmc",
    organization: "Cincinnati Children's Hospital Medical Center",
    requestedUrl: "https://www.cincinnatichildrens.org/careers",
    finalUrl: "https://www.cincinnatichildrens.org/careers",
    finalHost: "www.cincinnatichildrens.org",
    hostSuffix: "cincinnatichildrens.org",
    httpStatus: 200,
  },
  {
    id: "pnc",
    organization: "PNC",
    requestedUrl: "https://careers.pnc.com/",
    finalUrl: "https://careers.pnc.com/global/en",
    finalHost: "careers.pnc.com",
    hostSuffix: "pnc.com",
    httpStatus: 200,
  },
  {
    id: "ge-aerospace",
    organization: "GE Aerospace",
    requestedUrl: "https://careers.geaerospace.com/",
    finalUrl: "https://careers.geaerospace.com/global/en",
    finalHost: "careers.geaerospace.com",
    hostSuffix: "geaerospace.com",
    httpStatus: 200,
  },
  {
    id: "mayo",
    organization: "Mayo Clinic",
    requestedUrl: "https://jobs.mayoclinic.org/",
    finalUrl: "https://jobs.mayoclinic.org/",
    finalHost: "jobs.mayoclinic.org",
    hostSuffix: "mayoclinic.org",
    httpStatus: 200,
  },
  {
    id: "deloitte",
    organization: "Deloitte",
    requestedUrl: "https://www.deloitte.com/us/en/careers.html",
    finalUrl: "https://www.deloitte.com/us/en/careers/careers.html",
    finalHost: "www.deloitte.com",
    hostSuffix: "deloitte.com",
    httpStatus: 200,
  },
  {
    id: "tnc",
    organization: "The Nature Conservancy",
    requestedUrl: "https://www.nature.org/en-us/about-us/careers/",
    finalUrl: "https://www.nature.org/en-us/about-us/careers/",
    finalHost: "www.nature.org",
    hostSuffix: "nature.org",
    httpStatus: 200,
  },
  {
    id: "cleveland-fed",
    organization: "Federal Reserve Bank of Cleveland",
    requestedUrl: "https://www.clevelandfed.org/careers",
    finalUrl: "https://www.clevelandfed.org/careers",
    finalHost: "www.clevelandfed.org",
    hostSuffix: "clevelandfed.org",
    httpStatus: 200,
  },
  {
    id: "ideo",
    organization: "IDEO",
    requestedUrl: "https://www.ideo.com/careers",
    finalUrl: "https://www.ideo.com/careers",
    finalHost: "www.ideo.com",
    hostSuffix: "ideo.com",
    httpStatus: 200,
  },
  {
    id: "tfa",
    organization: "Teach For America",
    requestedUrl: "https://www.teachforamerica.org/careers",
    finalUrl: "https://www.teachforamerica.org/about/careers",
    finalHost: "www.teachforamerica.org",
    hostSuffix: "teachforamerica.org",
    httpStatus: 200,
  },
  {
    id: "epa",
    organization: "U.S. Environmental Protection Agency",
    requestedUrl: "https://www.epa.gov/careers",
    finalUrl: "https://www.epa.gov/careers",
    finalHost: "www.epa.gov",
    hostSuffix: "epa.gov",
    httpStatus: 200,
  },
];

export type CareerLinkId = (typeof VERIFIED_CAREER_LINKS)[number]["id"];

const LINK_BY_ID = new Map(VERIFIED_CAREER_LINKS.map((link) => [link.id, link]));
const LINK_BY_URL = new Map(VERIFIED_CAREER_LINKS.map((link) => [link.finalUrl, link]));

export function careerLinkById(id: CareerLinkId): VerifiedCareerLink {
  const link = LINK_BY_ID.get(id);
  if (!link) {
    throw new Error("Unknown careers link.");
  }
  return link;
}

function hostMatches(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith(`.${suffix}`);
}

/** Returns the verified https URL, or null when the input is not on the list. */
export function careerPageHref(input: string): string | null {
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
  return link.finalUrl;
}
