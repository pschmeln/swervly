import { describe, expect, it } from "vitest";
import { INSTRUMENT, INTEREST_ITEMS } from "@/content/interest-items";
import { AssessmentInput, ProfileInput } from "@/features/profile/schemas";
import { MAJORS } from "@/lib/constants";

function answers(value: number): Record<string, number> {
  return Object.fromEntries(INTEREST_ITEMS.map((item) => [item.id, value]));
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    major: MAJORS[0],
    year: 3,
    goal: "industry",
    locationConstraint: "anywhere",
    consentPrivacy: true,
    consentDataUse: true,
    ...overrides,
  };
}

describe("AssessmentInput", () => {
  it("rejects a missing item", () => {
    const incomplete = answers(3);
    delete incomplete[INTEREST_ITEMS[0].id];
    const parsed = AssessmentInput.safeParse({
      instrument: INSTRUMENT,
      answers: incomplete,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an extra item", () => {
    const parsed = AssessmentInput.safeParse({
      instrument: INSTRUMENT,
      answers: { ...answers(3), extra: 3 },
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects a value of 0 or 6", () => {
    const id = INTEREST_ITEMS[0].id;
    const zero = AssessmentInput.safeParse({
      instrument: INSTRUMENT,
      answers: { ...answers(3), [id]: 0 },
    });
    const six = AssessmentInput.safeParse({
      instrument: INSTRUMENT,
      answers: { ...answers(3), [id]: 6 },
    });
    expect(zero.success).toBe(false);
    expect(six.success).toBe(false);
  });
});

describe("ProfileInput", () => {
  it("rejects consent false", () => {
    const privacy = ProfileInput.safeParse(profile({ consentPrivacy: false }));
    const dataUse = ProfileInput.safeParse(profile({ consentDataUse: false }));
    expect(privacy.success).toBe(false);
    expect(dataUse.success).toBe(false);
  });
});
