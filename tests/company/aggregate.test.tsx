import { describe, expect, it } from "vitest";
import { SKILLS } from "@/content/skills";
import { aggregateForMajor, type ReviewForAggregate } from "@/features/company/aggregate";
import { PublicMajorSection } from "@/features/company/public-section";
import { renderToStaticMarkup } from "react-dom/server";

function review(overrides: Partial<ReviewForAggregate> = {}): ReviewForAggregate {
  return {
    major: "Electrical Engineering",
    wouldReturn: "yes",
    enjoyment: 4,
    learning: 4,
    mentorship: 4,
    clarityGained: 4,
    skillsUsed: ["CAD"],
    payHourly: 22.4,
    freeText: "Bring boots.",
    shareFreeText: true,
    ...overrides,
  };
}

describe("aggregateForMajor", () => {
  it("hides a major until 3 reviews and hides pay until 3 pay reports", () => {
    const hidden = aggregateForMajor([review(), review({ wouldReturn: "no" })], "Electrical Engineering", SKILLS);
    expect(hidden.visible).toBe(false);
    expect(hidden.sharedNotes).toEqual([]);
    expect(hidden.payRange).toBeNull();

    const shown = aggregateForMajor(
      [
        review({ payHourly: null, shareFreeText: false }),
        review({ wouldReturn: "maybe", payHourly: 30, freeText: "   ", shareFreeText: true }),
        review({ wouldReturn: "yes", payHourly: 25.2, skillsUsed: ["CAD", "Secret skill"] }),
      ],
      "Electrical Engineering",
      SKILLS,
    );
    expect(shown.visible).toBe(true);
    expect(shown.headline).toBe("2 of 3 Electrical Engineering students would go back");
    expect(shown.maybeLine).toBe("1 said maybe");
    expect(shown.payRange).toBeNull();
    expect(shown.topSkills).toEqual(["CAD"]);
    expect(shown.sharedNotes).toEqual(["Bring boots."]);
    expect(JSON.stringify(shown)).not.toContain("@");
  });

  it("shows a pay range only with 3 reports", () => {
    const shown = aggregateForMajor(
      [review({ payHourly: 20.2 }), review({ payHourly: 30.8 }), review({ payHourly: 25 })],
      "Electrical Engineering",
      SKILLS,
    );
    expect(shown.payRange).toEqual({ low: 20, high: 31 });
  });
});

describe("PublicMajorSection", () => {
  it("matches the company page and the preview", () => {
    const view = aggregateForMajor(
      [review(), review({ wouldReturn: "maybe" }), review({ wouldReturn: "no", shareFreeText: false })],
      "Electrical Engineering",
      SKILLS,
    );
    const html = renderToStaticMarkup(<PublicMajorSection employerName="Test Employer A" view={view} />);
    expect(html).toContain("1 of 3 Electrical Engineering students would go back");
    expect(html).toContain("1 said maybe");
    expect(html).toContain("Bring boots.");
    expect(html).toContain("Anything a student should know");
    expect(html).not.toContain("22.4");
  });
});
