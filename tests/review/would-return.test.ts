import { describe, expect, it } from "vitest";
import { isWouldReturn, wouldGoBackByStudent, wouldGoBackSummary } from "@/features/review/would-return";

describe("would go back", () => {
  it("counts each student once, by the answer on their latest co-op", () => {
    expect(
      wouldGoBackByStudent([
        { userId: "a", wouldReturn: "no", rotationNumber: 1 },
        { userId: "a", wouldReturn: "yes", rotationNumber: 3 },
        { userId: "a", wouldReturn: "maybe", rotationNumber: 2 },
        { userId: "b", wouldReturn: "maybe", rotationNumber: 1 },
        { userId: "c", wouldReturn: "no", rotationNumber: 1 },
      ]),
    ).toEqual({ students: 3, yes: 1, maybe: 1, no: 1, percentYes: 33 });
    expect(wouldGoBackByStudent([]).percentYes).toBe(0);
  });

  it("names the group and mentions reviews only when they differ from students", () => {
    expect(wouldGoBackSummary({ yes: 3, maybe: 1, students: 4, percentYes: 75, reviewCount: 5, groupLabel: "Electrical Engineering" })).toEqual({
      headline: "75% would go back: 3 of 4 students said yes.",
      maybeLine: "1 said maybe.",
      basisLine: "Based on 4 Electrical Engineering students (5 reviews).",
    });
    expect(wouldGoBackSummary({ yes: 1, maybe: 0, students: 2, percentYes: 50, reviewCount: 2, groupLabel: null }).basisLine).toBe(
      "Based on 2 students across all majors.",
    );
  });

  it("accepts only yes, maybe, and no", () => {
    expect(isWouldReturn("yes")).toBe(true);
    expect(isWouldReturn("maybe")).toBe(true);
    expect(isWouldReturn("no")).toBe(true);
    expect(isWouldReturn("pending")).toBe(false);
    expect(isWouldReturn("unknown")).toBe(false);
  });
});
