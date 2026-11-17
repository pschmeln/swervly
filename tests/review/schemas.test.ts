import { describe, expect, it } from "vitest";

import { RotationInput } from "@/features/review/schemas";

const validBase = {
  employerId: "550e8400-e29b-41d4-a716-446655440000",
  roleTitle: "Co-op Engineer",
  termSeason: "summer" as const,
  termYear: 2024,
  rotationNumber: 1,
  roleType: "design" as const,
  wouldReturn: "yes" as const,
  review: {
    enjoyment: 4,
    learning: 5,
    mentorship: 3,
    clarityGained: 4,
    skillsUsed: ["Programming", "CAD"] as const,
    shareFreeText: false,
  },
};

describe("RotationInput", () => {
  it("accepts a valid payload", () => {
    const result = RotationInput.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects ratings of 0 and 6", () => {
    expect(
      RotationInput.safeParse({
        ...validBase,
        review: { ...validBase.review, enjoyment: 0 },
      }).success,
    ).toBe(false);
    expect(
      RotationInput.safeParse({
        ...validBase,
        review: { ...validBase.review, learning: 6 },
      }).success,
    ).toBe(false);
  });

  it("rejects rotationNumber 6", () => {
    expect(
      RotationInput.safeParse({
        ...validBase,
        rotationNumber: 6,
      }).success,
    ).toBe(false);
  });

  it("saves an empty note with sharing forced off", () => {
    const blank = RotationInput.safeParse({
      ...validBase,
      review: {
        ...validBase.review,
        freeText: "   ",
        shareFreeText: true,
      },
    });
    const missing = RotationInput.safeParse({
      ...validBase,
      review: {
        ...validBase.review,
        shareFreeText: true,
      },
    });
    expect(blank.success).toBe(true);
    expect(missing.success).toBe(true);
    if (blank.success) expect(blank.data.review.shareFreeText).toBe(false);
    if (missing.success) expect(missing.data.review.shareFreeText).toBe(false);
  });

  it("rejects a return-offer value", () => {
    expect(
      RotationInput.safeParse({
        ...validBase,
        wouldReturn: "pending",
      }).success,
    ).toBe(false);
  });

  it("rejects a termYear next year", () => {
    const nextYear = new Date().getFullYear() + 1;
    expect(
      RotationInput.safeParse({
        ...validBase,
        termYear: nextYear,
      }).success,
    ).toBe(false);
  });
});
