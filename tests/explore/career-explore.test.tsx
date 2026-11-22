import { VERIFIED_CAREER_LINKS } from "@/features/explore/links";
import { renderToStaticMarkup } from "react-dom/server";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PageShell } from "@/components/ui";
import { CareerExplore } from "@/features/explore/career-explore";
import { FORBIDDEN_PROTOTYPE_CLAIM } from "@/features/explore/local-state";
import { careerPageHref } from "@/features/explore/links";
import {
  DEMO_DISCUSSIONS_LABEL,
  DEMO_FOUNDER_LABEL,
  DEMO_PREVIEW_LABEL,
  DEMO_PREVIEW_NOTE,
  DIRECTORY_EXPERIENCE_LINE,
  PROTOTYPE_BANNER,
  SAMPLE_EXPERIENCES_LABEL,
  type ExploreModel,
} from "@/features/explore/types";
import { buildExploreModel } from "@/features/explore/view-model";

// Career links expire 90 days after their check; pin "today" so this test does not.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-21T12:00:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

function model(): ExploreModel {
  return buildExploreModel({
    stored: { major: "Nursing", majorSource: "catalog", customMajorText: null },
    goal: "industry",
    dismissedRoleIds: [],
    direction: {
      label: "Worth exploring from your major and stated goal.",
      suggestions: [
        {
          roleType: "healthcare_clinical",
          roleLabel: "Healthcare — clinical",
          reason: "Early hypothesis: clinical work is a place to explore.",
          source: "rules",
          evidenceLabel: "Early hypothesis",
        },
        {
          roleType: "healthcare_admin",
          roleLabel: "Healthcare administration",
          reason: "Early hypothesis: administration is a place to explore.",
          source: "rules",
          evidenceLabel: "Early hypothesis",
        },
      ],
    },
  });
}

function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

describe("career exploration prototype", () => {
  it("renders the sample screen with safe external links and shared experiences only", () => {
    const html = renderToStaticMarkup(
      <PageShell title="Career exploration">
        <CareerExplore model={model()} phase="ready" />
      </PageShell>,
    );
    const text = visibleText(html);
    expect(html).toContain("Career exploration");
    expect(text).toContain(PROTOTYPE_BANNER);
    expect(text).toContain("Your direction");
    expect(text).toContain("Explore career paths");
    expect(text).toContain(DEMO_PREVIEW_LABEL);
    expect(text).toContain(DEMO_PREVIEW_NOTE);
    expect(text).toContain(SAMPLE_EXPERIENCES_LABEL);
    expect(text).toContain(DEMO_DISCUSSIONS_LABEL);
    expect(text).toContain(DEMO_FOUNDER_LABEL);
    expect(text).toContain("Non-persistent bookmark. Nothing is stored.");
    expect(text).toContain("Companies & opportunities");
    expect(text).toContain("Nursing");
    expect(text).toContain("Healthcare — clinical");
    expect(text).toContain(
      "Listed under Healthcare — clinical and Healthcare administration, which are also among your direction suggestions.",
    );
    expect(text).toContain("Invented sample: the team drew the clinic schedule on a whiteboard");
    expect(text).not.toContain("1 sample experience marked as shared.");
    expect(text).toContain(DIRECTORY_EXPERIENCE_LINE);
    // No invented placeholder company any more (ground rule: no fake content shown as real).
    expect(text).not.toContain("Sample Org With No Page On File");
    expect(text).toContain("No sample answers yet.");
    expect(text).toContain(DEMO_FOUNDER_LABEL);
    expect(text).toContain("Link checked 2026-11-21.");
    expect(html).toContain('aria-label="Exploration sections"');
    expect(html).toContain('href="#demo-preview"');
    expect(html).not.toContain('href="#student-experiences"');
    expect(html).toContain('href="/direction"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain("Browse sample questions");
    expect(html).toContain('role="note"');
    expect(text).not.toContain("UNCONSENTED-SAMPLE-NOTE-7F3A");
    expect(text).not.toContain("Hidden Sample");
    expect(text).not.toMatch(FORBIDDEN_PROTOTYPE_CLAIM);
    expect(html).not.toContain("@");

    const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map((match) => match[0]);
    const external = anchors.filter((tag) => /href="https:/.test(tag));
    expect(external).toHaveLength(VERIFIED_CAREER_LINKS.length);
    for (const tag of external) {
      const href = /href="([^"]+)"/.exec(tag)?.[1]?.replaceAll("&amp;", "&");
      expect(href).toBeTruthy();
      expect(careerPageHref(href ?? "")).toBe(href);
      expect(tag).toContain('target="_blank"');
      expect(tag).toContain('rel="noopener noreferrer"');
    }
    expect(text).toContain("Official careers page");
    expect(text).toContain("External");
    expect(text).toContain("opens in a new tab");
  });

  it("renders loading and empty states", () => {
    const ready = model();
    const loading = visibleText(
      renderToStaticMarkup(<CareerExplore model={ready} phase="loading" />),
    );
    expect(loading).not.toContain(PROTOTYPE_BANNER);
    expect(loading).toContain("Loading exploration…");
    expect(loading).not.toContain("Mayo Clinic");
    expect(loading).not.toContain("Rowan Example");

    const empty = visibleText(
      renderToStaticMarkup(
        <CareerExplore
          model={{ ...ready, companies: [], experiences: [], questions: [] }}
          phase="ready"
        />,
      ),
    );
    expect(empty).toContain("No company information is on file for this view.");
    expect(empty).toContain("No shared sample experiences yet.");
    expect(empty).toContain("No sample questions for this filter.");
    expect(empty).not.toContain("Why this company is shown");
  });

  it("keeps invented clinical notes inside Demo preview and off the direction", () => {
    const html = renderToStaticMarkup(<CareerExplore model={model()} phase="ready" />);
    const demoAt = html.indexOf('id="demo-preview"');
    const directionAt = html.indexOf('id="your-direction"');
    const pathsAt = html.indexOf('id="career-paths"');
    const companiesAt = html.indexOf('id="companies"');
    const note = "Invented sample: the team drew the clinic schedule on a whiteboard";
    expect(directionAt).toBeGreaterThan(-1);
    expect(pathsAt).toBeGreaterThan(directionAt);
    expect(companiesAt).toBeGreaterThan(pathsAt);
    expect(demoAt).toBeGreaterThan(companiesAt);
    expect(html.indexOf(note)).toBeGreaterThan(demoAt);
    expect(html.slice(0, demoAt)).not.toContain(note);
    expect(html.slice(0, demoAt)).not.toContain(PROTOTYPE_BANNER);
    expect(html.slice(demoAt)).toContain(DEMO_PREVIEW_NOTE);
    expect(html.slice(demoAt)).toContain(SAMPLE_EXPERIENCES_LABEL);
    const companiesHtml = html.slice(companiesAt, demoAt);
    expect(companiesHtml).toContain(DIRECTORY_EXPERIENCE_LINE);
    expect(companiesHtml).not.toContain(note);
    expect(companiesHtml).not.toContain("sample experience marked as shared");
  });

  it("escapes sample text and drops an unsafe careers URL", () => {
    const ready = model();
    const html = renderToStaticMarkup(
      <CareerExplore
        model={{
          ...ready,
          questions: [{ ...ready.questions[0], title: "<script>alert(1)</script>", answers: [] }],
          companies: [
            {
              ...ready.companies[0],
              name: "Bad Link Co",
              careersUrl: "javascript:alert(1)",
              linkCheckedOn: null,
              experienceCount: 0,
            },
          ],
        }}
        phase="ready"
      />,
    );
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("javascript:");
    expect(visibleText(html)).toContain("No official careers page is on file.");
  });
});
