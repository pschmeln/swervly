import { describe, expect, it } from "vitest";
import { wouldGoBackSummary } from "@/features/review/would-return";

describe("wouldGoBackSummary", () => {
  it("excludes unanswered historical rows from satisfaction stats", () => {
    expect(wouldGoBackSummary({ yes: 0, maybe: 0, no: 0, major: "Mechanical Engineering" })).toEqual({
      headline: "Would-you-go-back answers are not available yet",
      maybeLine: "Students still need to confirm that question.",
    });
  });

  it("counts only genuine yes/maybe/no answers", () => {
    expect(wouldGoBackSummary({ yes: 2, maybe: 1, no: 0, major: "Electrical Engineering" })).toEqual({
      headline: "2 of 3 Electrical Engineering students would go back",
      maybeLine: "1 said maybe",
    });
  });
});
