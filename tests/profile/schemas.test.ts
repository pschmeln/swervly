import { describe, expect, it } from "vitest";
import { INSTRUMENT, QUIZ_ITEMS } from "@/content/mini-ipip";
import { AssessmentInput, ProfileInput } from "@/features/profile/schemas";
import { MAJORS } from "@/lib/constants";

function answers(value: number): Record<string, number> {
  return Object.fromEntries(QUIZ_ITEMS.map((item) => [item.id, value]));
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    school: "University of Cincinnati",
    major: MAJORS[0],
    year: 3,
    goal: "industry",
    openToAnywhere: true,
    openToRemote: false,
    consentPrivacy: true,
    consentDataUse: true,
    ...overrides,
  };
}

describe("AssessmentInput", () => {
  it("rejects a missing item", () => {
    const incomplete = answers(3);
    delete incomplete[QUIZ_ITEMS[0].id];
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
    const id = QUIZ_ITEMS[0].id;
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
  it("requires a school and stores the trimmed name", () => {
    const missing = ProfileInput.safeParse(profile({ school: undefined }));
    const blank = ProfileInput.safeParse(profile({ school: "  " }));
    const short = ProfileInput.safeParse(profile({ school: "A" }));
    const parsed = ProfileInput.safeParse(
      profile({ school: "  University of Cincinnati  " }),
    );
    expect(missing.success).toBe(false);
    expect(blank.success).toBe(false);
    expect(short.success).toBe(false);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.school).toBe("University of Cincinnati");
  });

  it("rejects consent false", () => {
    const privacy = ProfileInput.safeParse(profile({ consentPrivacy: false }));
    const dataUse = ProfileInput.safeParse(profile({ consentDataUse: false }));
    expect(privacy.success).toBe(false);
    expect(dataUse.success).toBe(false);
  });
});

describe("AssessmentInput end-of-quiz majors choice", () => {
  it("accepts the choice, and still accepts a quiz without it", async () => {
    const { AssessmentInput } = await import("@/features/profile/schemas");
    const { INSTRUMENT, QUIZ_ITEMS } = await import("@/content/mini-ipip");
    const answers = Object.fromEntries(QUIZ_ITEMS.map((item) => [item.id, 3]));
    expect(AssessmentInput.safeParse({ instrument: INSTRUMENT, answers, exploringMajors: true }).success).toBe(true);
    expect(AssessmentInput.safeParse({ instrument: INSTRUMENT, answers }).success).toBe(true);
    expect(AssessmentInput.safeParse({ instrument: INSTRUMENT, answers, exploringMajors: "yes" }).success).toBe(false);
  });
});
