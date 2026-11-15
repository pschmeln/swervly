import { describe, expect, it } from "vitest";
import { INTEREST_ITEMS } from "@/content/interest-items";
import { scoreRiasec, toProfileVector, VECTOR_VERSION } from "@/features/profile/scoring";

function answersFor(valueAt: (index: number) => number): Record<string, number> {
  return Object.fromEntries(
    INTEREST_ITEMS.map((item, index) => [item.id, valueAt(index)]),
  );
}

describe("toProfileVector", () => {
  it("maps all-3 answers to a zero vector", () => {
    expect(toProfileVector(answersFor(() => 3))).toEqual(
      Array(INTEREST_ITEMS.length).fill(0),
    );
  });

  it("maps all-5 answers to all 1", () => {
    expect(toProfileVector(answersFor(() => 5))).toEqual(
      Array(INTEREST_ITEMS.length).fill(1),
    );
  });

  it("follows INTEREST_ITEMS order", () => {
    const byIndex = answersFor((index) => (index % 5) + 1);
    const reversedInsertion = Object.fromEntries(
      [...INTEREST_ITEMS].reverse().map((item) => [item.id, byIndex[item.id]]),
    );
    const expected = INTEREST_ITEMS.map((_, index) => (((index % 5) + 1) - 3) / 2);
    expect(toProfileVector(reversedInsertion)).toEqual(expected);
  });
});

describe("scoreRiasec", () => {
  it("returns each scale mean rounded to two decimals", () => {
    const answers = Object.fromEntries(
      INTEREST_ITEMS.map((item) => [item.id, item.scale === "R" ? 1 : 3]),
    );
    const realistic = INTEREST_ITEMS.filter((item) => item.scale === "R");
    answers[realistic[0].id] = 2;

    expect(scoreRiasec(answers)).toEqual({
      R: 1.2,
      I: 3,
      A: 3,
      S: 3,
      E: 3,
      C: 3,
    });
  });
});

describe("VECTOR_VERSION", () => {
  it("is 1", () => {
    expect(VECTOR_VERSION).toBe(1);
  });
});
