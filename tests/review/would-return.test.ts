import { describe, expect, it } from "vitest";
import { isWouldReturn, wouldGoBackSummary } from "@/features/review/would-return";

describe("wouldGoBackSummary", () => {
  it("counts co-op experiences and reports student basis separately", () => {
    expect(
      wouldGoBackSummary({ yes: 3, maybe: 1, no: 0, contributorCount: 3 }),
    ).toEqual({
      headline: '3 of 4 co-op experiences were rated "Would go back".',
      maybeLine: "1 said maybe.",
      basisLine: "Based on 4 reviews from 3 students.",
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
