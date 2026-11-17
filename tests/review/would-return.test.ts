import { describe, expect, it } from "vitest";
import { isWouldReturn, wouldGoBackSummary } from "@/features/review/would-return";

describe("wouldGoBackSummary", () => {
  it("counts Yes / Maybe / No for Would you go back?", () => {
    expect(wouldGoBackSummary({ yes: 2, maybe: 1, no: 0, major: "Electrical Engineering" })).toEqual({
      headline: "2 of 3 Electrical Engineering students would go back",
      maybeLine: "1 said maybe",
    });
  });

  it("accepts only yes, maybe, and no", () => {
    expect(isWouldReturn("yes")).toBe(true);
    expect(isWouldReturn("maybe")).toBe(true);
    expect(isWouldReturn("no")).toBe(true);
    expect(isWouldReturn("pending")).toBe(false);
    expect(isWouldReturn("unknown")).toBe(false);
  });
});
