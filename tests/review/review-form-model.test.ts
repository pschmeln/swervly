import { describe, expect, it } from "vitest";
import {
  clearedErrors,
  initialForCreate,
  parsePay,
  previewBody,
  rotationBody,
  type FormFields,
} from "@/features/review/components/review-form-model";

const filled: FormFields = {
  ...initialForCreate([]),
  employerId: "e1",
  employerName: "GE Aerospace",
  roleTitle: "  Design co-op ",
  termSeason: "fall",
  termYear: "2025",
  rotationNumber: "2",
  payHourly: "22.5",
  roleType: "design",
  wouldReturn: "yes",
  enjoyment: 4,
  learning: 3,
  mentorship: 5,
  clarityGained: 2,
  skillsUsed: ["CAD"],
  freeText: "  Good team ",
  shareFreeText: true,
};

describe("review form model", () => {
  it("starts a new co-op at the lowest unused number", () => {
    expect(initialForCreate([1, 2, 4]).rotationNumber).toBe("3");
    expect(initialForCreate([1, 2, 3, 4, 5, 6, 7, 8]).rotationNumber).toBe("1");
  });

  it("reads pay as blank, a number, or not a number", () => {
    expect(parsePay(" ")).toBeUndefined();
    expect(parsePay("22.5")).toBe(22.5);
    expect(parsePay("abc")).toBeNaN();
  });

  it("builds the save body with trimmed text and the share rule", () => {
    expect(rotationBody(filled, 22.5)).toEqual({
      employerId: "e1",
      roleTitle: "Design co-op",
      termSeason: "fall",
      termYear: 2025,
      rotationNumber: 2,
      payHourly: 22.5,
      workPlaceGeoid: null,
      roleType: "design",
      wouldReturn: "yes",
      review: { enjoyment: 4, learning: 3, mentorship: 5, clarityGained: 2, skillsUsed: ["CAD"], freeText: "Good team", shareFreeText: true },
    });
    const noNote = rotationBody({ ...filled, freeText: "   " }, undefined);
    expect(noNote).not.toHaveProperty("payHourly");
    expect(noNote.review).not.toHaveProperty("freeText");
    expect(noNote.review.shareFreeText).toBe(false);
  });

  it("asks for the missing answers before a preview", () => {
    expect(previewBody({ ...filled, roleType: "" }, undefined)).toEqual({
      error: "Choose a company, a role type, and whether you would go back.",
    });
    expect(previewBody({ ...filled, mentorship: null }, undefined)).toEqual({ error: "Answer the four ratings before previewing." });
    const ok = previewBody({ ...filled, payHourly: "abc" }, "r1");
    expect("body" in ok && ok.body).toMatchObject({ rotationId: "r1", employerId: "e1" });
    expect("body" in ok && ok.body).not.toHaveProperty("payHourly");
  });

  it("clears a field's errors, under both spellings", () => {
    const errors = { employerId: "x", name: "y", "review.enjoyment": "z", roleTitle: "w" };
    expect(clearedErrors(errors, "employerName")).toEqual({ "review.enjoyment": "z", roleTitle: "w" });
    expect(clearedErrors(errors, "enjoyment")).toEqual({ employerId: "x", name: "y", roleTitle: "w" });
  });
});
