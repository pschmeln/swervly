import { describe, expect, it } from "vitest";
import { SKILLS } from "@/content/skills";
import { aggregateForMajor, ALL_MAJORS, companyAverages, MIN_DISTINCT_PAY_CONTRIBUTORS, type ReviewForAggregate } from "@/features/company/aggregate";
import { CompanyAveragesSection, CompanyAveragesSummary, NOT_ENOUGH_MAJOR, NOTHING_YET } from "@/features/company/averages-section";
import { PublicMajorSection } from "@/features/company/public-section";
import { renderToStaticMarkup } from "react-dom/server";

function review(overrides: Partial<ReviewForAggregate> = {}): ReviewForAggregate {
  return {
    userId: "user-a",
    major: "Electrical Engineering",
    wouldReturn: "yes",
    rotationNumber: 1,
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
    expect(threeStudents.headline).toBe("67% would go back: 2 of 3 students said yes.");
    expect(threeStudents.wouldGoBackPercent).toBe(67);
    expect(threeStudents.maybeLine).toBe("1 said maybe.");
    expect(threeStudents.basisLine).toBe("Based on 3 Electrical Engineering students.");
    // Only two different students reported pay (b and c): below the 3-student pay minimum.
    expect(threeStudents.payRange).toBeNull();
    expect(threeStudents.topSkills).toEqual(["CAD"]);
    expect(threeStudents.sharedNotes.map((note) => note.text)).toEqual(["Bring boots."]);
    expect(JSON.stringify(threeStudents)).not.toContain("@");
  });

  it("counts each student once for would-go-back, by their latest co-op", () => {
    const shown = aggregateForMajor(
      [
        review({ userId: "a", payHourly: 20.2, wouldReturn: "maybe" }),
        review({ userId: "b", payHourly: 30.8, wouldReturn: "yes" }),
        review({ userId: "c", payHourly: 25, wouldReturn: "no" }),
        review({ userId: "a", payHourly: 40, wouldReturn: "yes", rotationNumber: 2 }),
      ],
      "Electrical Engineering",
      SKILLS,
    );
    expect(shown.visible).toBe(true);
    expect(shown.payRange).toEqual({ low: 20, high: 40 });
    expect(shown.headline).toBe("67% would go back: 2 of 3 students said yes.");
    expect(shown.maybeLine).toBe("0 said maybe.");
    expect(shown.basisLine).toBe("Based on 3 Electrical Engineering students (4 reviews).");
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
    expect(html).toContain("33% would go back: 1 of 3 students said yes.");
    expect(html).toContain("1 said maybe.");
    expect(html).toContain("Based on 3 Electrical Engineering students.");
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

describe("all-majors fallback (item 4)", () => {
  it("shows the viewer's major when it passes, and no fallback", () => {
    const result = companyAverages([review({ userId: "a" }), review({ userId: "b" })], "Electrical Engineering", SKILLS);
    expect(result.mine.visible).toBe(true);
    expect(result.allMajors).toBeNull();
  });

  it("falls back to all majors under the same 2-student minimum, without pay or notes", () => {
    const reviews = [
      review({ userId: "a", major: "Mechanical Engineering", payHourly: 20 }),
      review({ userId: "b", major: "Computer Science", payHourly: 30 }),
      review({ userId: "c", major: "Finance", payHourly: 25 }),
    ];
    const result = companyAverages(reviews, "Electrical Engineering", SKILLS);
    expect(result.mine.visible).toBe(false);
    expect(result.allMajors?.visible).toBe(true);
    expect(result.allMajors?.major).toBe(ALL_MAJORS);
    expect(result.allMajors?.payRange).toBeNull();
    expect(result.allMajors?.sharedNotes).toEqual([]);
    expect(result.allMajors?.basisLine).toBe("Based on 3 students across all majors.");
    const html = renderToStaticMarkup(<CompanyAveragesSection employerName="Test Employer" viewerMajor="Electrical Engineering" averages={result} />);
    expect(html).toContain(NOT_ENOUGH_MAJOR);
    expect(html).toContain("Pay and written notes appear only within a student&#x27;s own major.");
    expect(html).not.toContain("Bring boots.");
  });

  it("shows nothing when even all majors is below the minimum", () => {
    const result = companyAverages([review({ userId: "a", major: "Finance" })], "Electrical Engineering", SKILLS);
    expect(result.allMajors).toBeNull();
    const html = renderToStaticMarkup(<CompanyAveragesSection employerName="Test Employer" viewerMajor="Electrical Engineering" averages={result} />);
    expect(html).toContain(NOTHING_YET);
  });

  it("summarizes a card with ratings, would go back and the student count", () => {
    const result = companyAverages([review({ userId: "a" }), review({ userId: "b", wouldReturn: "no", enjoyment: 2 })], "Electrical Engineering", SKILLS);
    const html = renderToStaticMarkup(<CompanyAveragesSummary averages={result} href="/companies/x" hasMajor />);
    expect(html).toContain("Your major: Electrical Engineering");
    expect(html).toContain("Enjoyment 3.0");
    expect(html).toContain("50% would go back");
    expect(html).toContain("Based on 2 Electrical Engineering students.");
    expect(html).toContain('href="/companies/x"');
  });
});
