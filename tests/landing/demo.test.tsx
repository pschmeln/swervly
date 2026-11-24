import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LandingPitch, STEPS } from "@/app/page";
import { BEATS_PER_SCENE, BEAT_MS, DEMO_SCENES, demoFrame, ProductDemo } from "@/features/landing/demo";

describe("landing demo timing", () => {
  it("plays quiz, direction, plan, then the loop, and repeats", () => {
    expect(DEMO_SCENES.map((scene) => scene.key)).toEqual(["quiz", "direction", "plan", "loop"]);
    const scenes = Array.from({ length: DEMO_SCENES.length * BEATS_PER_SCENE + 1 }, (_, tick) => demoFrame(tick, true).scene);
    expect(scenes.slice(0, 4)).toEqual([0, 0, 0, 0]);
    expect(scenes[4]).toBe(1);
    expect(scenes.at(-1)).toBe(0);
  });

  it("shows each scene's finished state when paused or for reduced motion", () => {
    expect(demoFrame(5, false)).toEqual({ scene: 1, beat: BEATS_PER_SCENE - 1 });
    expect(demoFrame(5, true)).toEqual({ scene: 1, beat: 1 });
  });

  it("loops in under 15 seconds so a visitor sees it all", () => {
    expect(DEMO_SCENES.length * BEATS_PER_SCENE * BEAT_MS).toBeLessThanOrEqual(15_000);
  });
});

describe("landing demo markup", () => {
  const html = renderToStaticMarkup(<ProductDemo />);

  it("is labeled as made-up data and has a pause button and step buttons", () => {
    expect(html).toContain('aria-label="Demo of Swervly with made-up data"');
    expect(html).toContain("Sample data");
    expect(html).toContain("Pause demo");
    expect(html.match(/aria-label="Show step \d/g)).toHaveLength(DEMO_SCENES.length);
    expect(html).toContain('aria-current="step"');
  });

  it("hides the moving picture from screen readers and keeps the caption readable", () => {
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("1. Understand how you work");
  });

  it("follows the same three steps as the guide below it", () => {
    expect(DEMO_SCENES.slice(0, 3).map((scene) => scene.caption)).toEqual([
      STEPS[0].title,
      "Explore and compare careers",
      STEPS[2].title,
    ]);
    expect(STEPS[1].title).toBe("Explore and compare");
  });

  it("sits on the landing page with one Sign in and no Chinese text", () => {
    const page = renderToStaticMarkup(<LandingPitch />);
    expect(page).toContain("Demo of Swervly");
    expect(page.match(/Sign in/g)).toHaveLength(1);
    expect(page).not.toMatch(/[㐀-鿿]/);
  });
});
