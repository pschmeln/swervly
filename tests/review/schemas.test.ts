import { describe, expect, it } from "vitest";

import { RotationInput } from "@/features/review/schemas";

const validBase = {
  employerId: "550e8400-e29b-41d4-a716-446655440000",
  roleTitle: "Co-op Engineer",
  termSeason: "summer" as const,
  termYear: 2024,
  rotationNumber: 1,
  returnOffer: "pending" as const,
  review: {
    enjoyment: 4,
    learning: 5,
    mentorship: 3,
    clarityGained: 4,
    skillsUsed: ["Programming", "CAD & 3D modeling"] as const,
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

  it("rejects shareFreeText true with empty freeText", () => {
    expect(
      RotationInput.safeParse({
        ...validBase,
        review: {
          ...validBase.review,
          freeText: "   ",
          shareFreeText: true,
        },
      }).success,
    ).toBe(false);
    expect(
      RotationInput.safeParse({
        ...validBase,
        review: {
          ...validBase.review,
          shareFreeText: true,
        },
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
