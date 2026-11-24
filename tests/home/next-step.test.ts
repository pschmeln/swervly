import { describe, expect, it } from "vitest";
import { nextStep } from "@/features/home/next-step";

const done = { onboarded: true, quizDone: true };

describe("Home next step (V1-08)", () => {
  it("walks Self → Direction → Action, one step at a time", () => {
    expect(nextStep({ onboarded: false, quizDone: false, chosenTitle: null, plan: null }).key).toBe("onboarding");
    expect(nextStep({ onboarded: true, quizDone: false, chosenTitle: null, plan: null }).key).toBe("quiz");
    expect(nextStep({ ...done, chosenTitle: null, plan: null })).toMatchObject({ key: "direction", href: "/direction" });
    expect(nextStep({ ...done, chosenTitle: "Mechanical Engineers", plan: null })).toMatchObject({
      key: "plan",
      title: "Make a plan for Mechanical Engineers",
      href: "/action",
    });
  });

  it("sends a returning student with a plan back to it, naming the next open step", () => {
    const next = nextStep({ ...done, chosenTitle: null, plan: { goalTitle: "Electrical Engineers", nextTask: "Read two job posts" } });
    expect(next).toMatchObject({ key: "continue", title: "Keep going on Electrical Engineers", href: "/action" });
    expect(next.body).toBe("Next up: Read two job posts");
    expect(nextStep({ ...done, chosenTitle: null, plan: { goalTitle: "X", nextTask: null } }).body).toContain("Every step is done");
  });

  it("never makes a co-op review the next step", () => {
    for (const onboarded of [true, false])
      for (const quizDone of [true, false])
        for (const chosenTitle of [null, "A"])
          for (const plan of [null, { goalTitle: "A", nextTask: null }]) {
            const next = nextStep({ onboarded, quizDone, chosenTitle, plan });
            expect(next.href).not.toContain("/reviews");
            expect(`${next.title} ${next.body} ${next.cta}`).not.toMatch(/review/i);
          }
  });
});
