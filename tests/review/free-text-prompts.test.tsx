import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReviewForm } from "@/features/review/components/review-form";
import {
  FREE_TEXT_MAX,
  insertStarter,
  placeholderAt,
  REVIEW_PROMPT_CHIPS,
  REVIEW_PROMPT_QUESTIONS,
} from "@/features/review/free-text-prompts";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

describe("review note prompts", () => {
  it("rotates through every question and wraps around", () => {
    const seen = Array.from({ length: REVIEW_PROMPT_QUESTIONS.length }, (_, index) => placeholderAt(index));
    expect(new Set(seen).size).toBe(REVIEW_PROMPT_QUESTIONS.length);
    expect(placeholderAt(REVIEW_PROMPT_QUESTIONS.length)).toBe(REVIEW_PROMPT_QUESTIONS[0]);
    expect(placeholderAt(0)).toBe("What surprised you in your first week?");
  });

  it("offers 3 or 4 chips", () => {
    expect(REVIEW_PROMPT_CHIPS.length).toBeGreaterThanOrEqual(3);
    expect(REVIEW_PROMPT_CHIPS.length).toBeLessThanOrEqual(4);
  });

  it("starts an empty note with the starter and adds a new paragraph otherwise", () => {
    const starter = REVIEW_PROMPT_CHIPS[0].starter;
    expect(insertStarter("", starter)).toBe(starter);
    expect(insertStarter("   \n", starter)).toBe(starter);
    expect(insertStarter("Great team.  ", starter)).toBe(`Great team.\n\n${starter}`);
  });

  it("never pushes the note past the length limit", () => {
    const full = "x".repeat(FREE_TEXT_MAX - 3);
    expect(insertStarter(full, "A normal day looked like ")).toBe(full);
  });

  it("keeps the note optional and shows a question and the chips on the form", () => {
    const html = renderToStaticMarkup(<ReviewForm mode="create" />);
    const note = html.match(/<textarea[^>]*id="freeText"[^>]*>/)?.[0] ?? "";
    expect(note).toContain(`placeholder="${REVIEW_PROMPT_QUESTIONS[0]}"`);
    expect(note).not.toContain("required");
    expect(html).toContain("Optional. Tap a prompt below to get started.");
    for (const chip of REVIEW_PROMPT_CHIPS) expect(html).toContain(chip.label.replace("'", "&#x27;"));
  });
});
