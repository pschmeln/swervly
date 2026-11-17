import { describe, expect, it } from "vitest";
import { CONTENT_VERSION, INSTRUMENT, QUIZ_ITEMS, TRAITS } from "@/content/mini-ipip";
import { scoreMiniIpip, toProfileVector, VECTOR_VERSION } from "@/features/profile/scoring";
import { readTraits } from "@/features/profile/traits";

function answers(value: number): Record<string, number> {
  return Object.fromEntries(QUIZ_ITEMS.map((item) => [item.id, value]));
}

describe("Mini-IPIP content", () => {
  it("keeps 20 versioned items, original wording, and keying", () => {
    expect(CONTENT_VERSION).toBe(1);
    expect(INSTRUMENT).toBe("mini_ipip_20");
    expect(QUIZ_ITEMS).toHaveLength(20);
    for (const trait of TRAITS) {
      expect(QUIZ_ITEMS.filter((item) => item.trait === trait)).toHaveLength(4);
    }
    const reverse = new Set(["q06", "q07", "q08", "q09", "q10", "q15", "q16", "q17", "q18", "q19", "q20"]);
    for (const item of QUIZ_ITEMS) {
      expect(item.original.length).toBeGreaterThan(0);
      expect(item.text.length).toBeGreaterThan(0);
      expect(item.keyed).toBe(reverse.has(item.id) ? "reverse" : "forward");
    }
    expect(QUIZ_ITEMS[0]?.original).toBe("Am the life of the party.");
    expect(QUIZ_ITEMS[5]?.original).toBe("Don't talk a lot.");
  });
});

describe("scoreMiniIpip", () => {
  it("scores a neutral quiz at the midpoint", () => {
    expect(scoreMiniIpip(answers(3))).toEqual({
      extraversion: 12,
      agreeableness: 12,
      conscientiousness: 12,
      neuroticism: 12,
      openness: 12,
    });
  });

  it("reverse-keys items before summing", () => {
    const highExtraversion = answers(3);
    highExtraversion.q01 = 5;
    highExtraversion.q06 = 1;
    highExtraversion.q11 = 5;
    highExtraversion.q16 = 1;
    expect(scoreMiniIpip(highExtraversion).extraversion).toBe(20);
  });
});

describe("toProfileVector", () => {
  it("stores the 20 raw answers in content order", () => {
    const raw = answers(3);
    raw.q01 = 5;
    raw.q20 = 1;
    const vector = toProfileVector(raw);
    expect(vector).toHaveLength(20);
    expect(vector[0]).toBe(5);
    expect(vector[19]).toBe(1);
    expect(VECTOR_VERSION).toBe(2);
  });
});

describe("readTraits", () => {
  it("uses plain language instead of a trait score", () => {
    const readings = readTraits({
      extraversion: 8,
      agreeableness: 16,
      conscientiousness: 12,
      neuroticism: 16,
      openness: 8,
    });
    const text = readings.map((reading) => `${reading.headline} ${reading.coopLine}`).join(" ");
    expect(text).toContain("You recharge alone");
    expect(text).toContain("You look out for the people around you");
    expect(text).not.toContain("Extraversion:");
    expect(text).not.toMatch(/\b8\/20\b/);
  });
});
