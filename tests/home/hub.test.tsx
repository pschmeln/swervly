import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {} }) }));

import { DIRECTION_EXHAUSTED_ACTION, DIRECTION_EXHAUSTED_LABEL } from "@/features/direction/rules";
import { CYCLE_STEPS } from "@/features/home/cycle-graphic";
import { HomeHub, homeTraits, majorLine, type HomeHubProps } from "@/features/home/hub";
import { readTraits } from "@/features/profile/traits";

const scores = { extraversion: 6, agreeableness: 19, conscientiousness: 12, neuroticism: 20, openness: 15 };

const base: HomeHubProps = {
  quizDone: true,
  canReview: true,
  rotationCount: 2,
  majorLine: "Electrical Engineering · Year 3",
  traits: homeTraits(scores, readTraits(scores)),
  suggestions: [
    { roleType: "design", roleLabel: "Hardware design", reason: "Worth exploring." },
    { roleType: "test_validation", roleLabel: "Test and validation", reason: "Structured work." },
    { roleType: "software", roleLabel: "Software", reason: "Builds things." },
    { roleType: "research", roleLabel: "Research", reason: "Open questions." },
  ],
  interested: [{ roleType: "design", label: "Hardware design" }],
};

function text(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/\s+/g, " ");
}

describe("Home cycle graphic", () => {
  it("is Self, Direction, Action, Review with Action not linked", () => {
    expect(CYCLE_STEPS.map((step) => step.title)).toEqual(["Self", "Direction", "Action", "Review"]);
    expect(CYCLE_STEPS.find((step) => step.key === "action")?.href).toBeNull();
    const html = renderToStaticMarkup(<HomeHub {...base} />);
    for (const href of ['href="/profile"', 'href="/direction"', 'href="/reviews"']) expect(html).toContain(href);
    expect(text(html)).toContain("Coming soon");
    expect(html).toContain('aria-disabled="true"');
  });

  it("has no Chinese text", () => {
    expect(renderToStaticMarkup(<HomeHub {...base} />)).not.toMatch(/[㐀-鿿]/);
  });
});

describe("Home profile and direction windows", () => {
  it("shows the three most distinct traits, never the stress reading", () => {
    expect(base.traits.map((item) => item.trait)).toEqual(["agreeableness", "extraversion", "openness"]);
    expect(base.traits.every((item) => item.strength >= 0 && item.strength <= 1)).toBe(true);
  });

  it("shows the top three suggestions, Interested state and saved careers", () => {
    const html = renderToStaticMarkup(<HomeHub {...base} />);
    const t = text(html);
    expect(t).toContain("Hardware design");
    expect(t).toContain("Software");
    expect(t).not.toContain("Open questions.");
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(t).toContain("Saved careers");
    expect(t).toContain("2 co-ops and internships logged.");
    expect(t).toContain("Electrical Engineering · Year 3");
  });

  it("asks for the quiz before showing readings or careers", () => {
    const t = text(renderToStaticMarkup(<HomeHub {...base} quizDone={false} traits={[]} suggestions={[]} interested={[]} />));
    expect(t).toContain("Take the quiz");
    expect(t).toContain("Your direction appears after the quiz");
    expect(t).not.toContain("Saved careers");
  });

  it("offers Log a co-op review when none are logged", () => {
    const html = renderToStaticMarkup(<HomeHub {...base} rotationCount={0} />);
    expect(html).toContain('href="/reviews/new"');
    expect(text(html)).toContain("No co-ops logged yet.");
  });

  it("hides the Top suggestions heading when the list is empty, and keeps exhausted copy plus nav", () => {
    const html = renderToStaticMarkup(<HomeHub {...base} suggestions={[]} interested={[]} />);
    const t = text(html);
    expect(t).not.toContain("Top suggestions");
    expect(t).toContain(DIRECTION_EXHAUSTED_LABEL);
    expect(t).toContain(DIRECTION_EXHAUSTED_ACTION);
    expect(t.indexOf(DIRECTION_EXHAUSTED_LABEL)).toBeLessThan(t.indexOf(DIRECTION_EXHAUSTED_ACTION));
    expect(t).not.toContain("Not for me");
    expect(html).toContain('href="/direction"');
    expect(t).toContain("See all");
    expect(t).toContain("2 co-ops and internships logged.");
  });
});

describe("majorLine", () => {
  it("formats catalog, custom and undecided majors", () => {
    expect(majorLine({ major: "Nursing", majorSource: "catalog", customMajorText: null, year: 2 })).toBe("Nursing · Year 2");
    expect(majorLine({ major: "x", majorSource: "custom", customMajorText: "Glass Art", year: null })).toBe("Glass Art");
    expect(majorLine({ major: null, majorSource: "undecided", customMajorText: null, year: 1 })).toBe("Undecided / Not sure · Year 1");
    expect(majorLine({ major: null, majorSource: null, customMajorText: null, year: null })).toBeNull();
  });
});
