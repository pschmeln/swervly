import { describe, expect, it } from "vitest";
import {
  ageInDays,
  judgeCheck,
  pageTitle,
  renderChecksModule,
  type CareerLinkCheck,
} from "@/features/companies/link-check";

const careersPage = "<html><head><title>Careers at Example | Join our team</title></head><body><h1>Find jobs</h1></body></html>";

describe("careers link check", () => {
  it("accepts a 200 https careers page on the company's own domain", () => {
    expect(judgeCheck({ hostSuffix: "example.com", finalUrl: "https://careers.example.com/us/en", httpStatus: 200, html: careersPage })).toEqual({
      accepted: true,
      reason: null,
    });
  });

  it("rejects everything the Nov 17 check rejected", () => {
    const cases: [Parameters<typeof judgeCheck>[0], RegExp][] = [
      [{ hostSuffix: "example.com", finalUrl: "https://example.com/careers", httpStatus: 404, html: careersPage }, /HTTP 404/],
      [{ hostSuffix: "example.com", finalUrl: "https://example.com/careers", httpStatus: 403, html: careersPage }, /HTTP 403/],
      [{ hostSuffix: "example.com", finalUrl: null, httpStatus: null, html: "" }, /no response/],
      [{ hostSuffix: "example.com", finalUrl: "http://example.com/careers", httpStatus: 200, html: careersPage }, /not https/],
      [{ hostSuffix: "example.com", finalUrl: "https://boards.greenhouse.io/example", httpStatus: 200, html: careersPage }, /job board/],
      [{ hostSuffix: "example.com", finalUrl: "https://example.com.evil.net/careers", httpStatus: 200, html: careersPage }, /not on example.com/],
      [{ hostSuffix: "example.com", finalUrl: "https://example.com/careers", httpStatus: 200, html: "<title>Page not found</title><p>careers</p>" }, /error page/],
      [{ hostSuffix: "example.com", finalUrl: "https://example.com/", httpStatus: 200, html: "<title>Example Inc.</title><p>We make widgets.</p>" }, /careers page/],
    ];
    for (const [input, reason] of cases) {
      const verdict = judgeCheck(input);
      expect(verdict.accepted, JSON.stringify(input.finalUrl)).toBe(false);
      expect(verdict.reason).toMatch(reason);
    }
  });

  it("reads the title and counts days in UTC", () => {
    expect(pageTitle("<TITLE>\n  P&amp;G   Careers  </TITLE>")).toBe("P&G Careers");
    expect(pageTitle("<p>no title</p>")).toBeNull();
    expect(ageInDays("2026-11-17", new Date("2027-02-15T23:00:00Z"))).toBe(90);
    expect(ageInDays("2026-11-17", new Date("2027-02-16T01:00:00Z"))).toBe(91);
  });

  it("writes a module sorted by company id, so re-runs diff cleanly", () => {
    const row = (companyId: string): CareerLinkCheck => ({
      companyId,
      requestedUrl: `https://${companyId}.com/careers`,
      finalUrl: `https://${companyId}.com/careers`,
      finalHost: `${companyId}.com`,
      httpStatus: 200,
      title: "Careers",
      checkedOn: "2026-11-21",
      accepted: true,
      reason: null,
    });
    const text = renderChecksModule([row("zeta"), row("alpha")]);
    expect(text.indexOf('"alpha"')).toBeLessThan(text.indexOf('"zeta"'));
    expect(text).toContain("export const CAREER_LINK_CHECKS");
  });
});
