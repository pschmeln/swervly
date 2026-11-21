import { describe, expect, it } from "vitest";
import { SKILLS } from "@/content/skills";
import { aggregateForMajor, MIN_DISTINCT_PAY_CONTRIBUTORS, type ReviewForAggregate } from "@/features/company/aggregate";
import { PublicMajorSection } from "@/features/company/public-section";
import { renderToStaticMarkup } from "react-dom/server";

function review(overrides: Partial<ReviewForAggregate> = {}): ReviewForAggregate {
  return {
    userId: "user-a",
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
  it("hides a major until 2 distinct students contribute", () => {
    const oneStudentThreeReviews = aggregateForMajor(
      [
        review({ userId: "solo", wouldReturn: "yes" }),
        review({ userId: "solo", wouldReturn: "no", payHourly: 30 }),
        review({ userId: "solo", wouldReturn: "maybe", payHourly: 25 }),
      ],
      "Electrical Engineering",
      SKILLS,
    );
    expect(oneStudentThreeReviews.visible).toBe(false);
    expect(oneStudentThreeReviews.contributorCount).toBe(1);
    expect(oneStudentThreeReviews.payRange).toBeNull();
    expect(oneStudentThreeReviews.sharedNotes).toEqual([]);

    const twoStudents = aggregateForMajor(
      [review({ userId: "a", payHourly: null }), review({ userId: "b", payHourly: 30 })],
      "Electrical Engineering",
      SKILLS,
    );
    expect(twoStudents.visible).toBe(true);
    expect(twoStudents.contributorCount).toBe(2);
    // Only one student reported pay, so no range.
    expect(twoStudents.payRange).toBeNull();

    const threeStudents = aggregateForMajor(
      [
        review({ userId: "a", payHourly: null, shareFreeText: false }),
        review({ userId: "b", wouldReturn: "maybe", payHourly: 30, freeText: "   ", shareFreeText: true }),
        review({
          userId: "c",
          wouldReturn: "yes",
          payHourly: 25.2,
          skillsUsed: ["CAD", "Secret skill"],
        }),
      ],
      "Electrical Engineering",
      SKILLS,
    );
    expect(threeStudents.visible).toBe(true);
    expect(threeStudents.contributorCount).toBe(3);
    expect(threeStudents.headline).toBe(
      '2 of 3 co-op experiences were rated "Would go back".',
    );
    expect(threeStudents.maybeLine).toBe("1 said maybe.");
    expect(threeStudents.basisLine).toBe("Based on 3 reviews from 3 students.");
    // Only two different students reported pay (b and c): below the 3-student pay minimum.
    expect(threeStudents.payRange).toBeNull();
    expect(threeStudents.topSkills).toEqual(["CAD"]);
    expect(threeStudents.sharedNotes).toEqual(["Bring boots."]);
    expect(JSON.stringify(threeStudents)).not.toContain("@");
  });

  it("counts experiences for would-go-back and students separately", () => {
    const shown = aggregateForMajor(
      [
        review({ userId: "a", payHourly: 20.2, wouldReturn: "maybe" }),
        review({ userId: "b", payHourly: 30.8, wouldReturn: "yes" }),
        review({ userId: "c", payHourly: 25, wouldReturn: "no" }),
        review({ userId: "a", payHourly: 40, wouldReturn: "yes" }),
      ],
      "Electrical Engineering",
      SKILLS,
    );
    expect(shown.visible).toBe(true);
    expect(shown.payRange).toEqual({ low: 20, high: 40 });
    expect(shown.headline).toBe('2 of 4 co-op experiences were rated "Would go back".');
    expect(shown.maybeLine).toBe("1 said maybe.");
    expect(shown.basisLine).toBe("Based on 4 reviews from 3 students.");
    expect(shown.reviewCount).toBe(4);
    expect(shown.contributorCount).toBe(3);
  });

  it("keeps one student with multiple reviews from unlocking pay alone", () => {
    const hiddenPay = aggregateForMajor(
      [
        review({ userId: "a", payHourly: 20 }),
        review({ userId: "b", payHourly: null }),
        review({ userId: "c", payHourly: null }),
        review({ userId: "a", payHourly: 40 }),
      ],
      "Electrical Engineering",
      SKILLS,
    );
    expect(hiddenPay.visible).toBe(true);
    expect(hiddenPay.payRange).toBeNull();

    const twoPayStudents = aggregateForMajor(
      [review({ userId: "a", payHourly: 20 }), review({ userId: "b", payHourly: 22.5 })],
      "Electrical Engineering",
      SKILLS,
    );
    // Two reporters would mean each one could read the other's pay.
    expect(twoPayStudents.visible).toBe(true);
    expect(twoPayStudents.payRange).toBeNull();

    const threePayStudents = aggregateForMajor(
      [
        review({ userId: "a", payHourly: 20 }),
        review({ userId: "b", payHourly: 22.5 }),
        review({ userId: "c", payHourly: 21 }),
      ],
      "Electrical Engineering",
      SKILLS,
    );
    expect(threePayStudents.payRange).toEqual({ low: 20, high: 23 });
    expect(MIN_DISTINCT_PAY_CONTRIBUTORS).toBe(3);
  });
});

describe("PublicMajorSection", () => {
  it("matches the company page and the preview", () => {
    const view = aggregateForMajor(
      [
        review({ userId: "a" }),
        review({ userId: "b", wouldReturn: "maybe" }),
        review({ userId: "c", wouldReturn: "no", shareFreeText: false }),
      ],
      "Electrical Engineering",
      SKILLS,
    );
    const html = renderToStaticMarkup(<PublicMajorSection employerName="Test Employer A" view={view} />);
    expect(html).toContain("1 of 3 co-op experiences were rated &quot;Would go back&quot;.");
    expect(html).toContain("1 said maybe.");
    expect(html).toContain("Based on 3 reviews from 3 students.");
    expect(html).toContain("Bring boots.");
    expect(html).toContain("Anything a student should know");
    expect(html).not.toContain("22.4");

    const hidden = renderToStaticMarkup(
      <PublicMajorSection
        employerName="Test Employer A"
        view={aggregateForMajor([review({ userId: "solo" })], "Electrical Engineering", SKILLS)}
      />,
    );
    expect(hidden).toContain("different students");
  });
});
