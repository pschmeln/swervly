import { describe, expect, it, vi } from "vitest";
import { MAJORS } from "@/lib/constants";
import {
  academicExploration,
  displayMajor,
  ProfileWriteInput,
  publicAggregateMajor,
  resolveMajorWrite,
  selectionFromStored,
} from "@/features/majors/selection";

// These tests cover every major and career, including those hidden from engineering students.
vi.mock("@/lib/audience", () => import("../helpers/audience-all"));

const baseProfile = {
  school: "University of Cincinnati",
  year: 2,
  goal: "industry" as const,
  openToAnywhere: true, openToRemote: false,
  consentPrivacy: true as const,
  consentDataUse: true as const,
};

describe("major selection", () => {
  it("accepts a catalog major, undecided, and a custom major", () => {
    const nursing = ProfileWriteInput.safeParse({
      ...baseProfile,
      majorSelection: { source: "catalog", name: "Nursing" },
    });
    const undecided = ProfileWriteInput.safeParse({
      ...baseProfile,
      majorSelection: { source: "undecided" },
    });
    const custom = ProfileWriteInput.safeParse({
      ...baseProfile,
      majorSelection: { source: "custom", name: "Historic Preservation" },
    });
    expect(nursing.success).toBe(true);
    expect(undecided.success).toBe(true);
    expect(custom.success).toBe(true);
  });

  it("maps alias text onto the catalog and does not open a submission", () => {
    const resolved = resolveMajorWrite({
      majorSelection: { source: "custom", name: "Comp Sci" },
      exploringMajors: true,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.write).toMatchObject({
      source: "catalog",
      major: "Computer Science",
      customMajorText: null,
      submission: null,
      exploringMajors: true,
    });
  });

  it("does not promote short ambiguous aliases into the catalog", () => {
    for (const name of ["CS", "ME", "EE", "IT", "HR"]) {
      const resolved = resolveMajorWrite({ majorSelection: { source: "custom", name } });
      expect(resolved.ok).toBe(true);
      if (!resolved.ok) return;
      expect(resolved.write.source).toBe("custom");
      expect(resolved.write.major).toBeNull();
      expect(resolved.write.submission?.rawName).toBe(name);
    }
  });

  it("saves a custom major privately and does not block on approval", () => {
    const resolved = resolveMajorWrite({
      majorSelection: { source: "custom", name: "  Historic Preservation  " },
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.write.source).toBe("custom");
    expect(resolved.write.major).toBeNull();
    expect(resolved.write.customMajorText).toBe("Historic Preservation");
    expect(resolved.write.submission?.normalizedName).toBe("historic preservation");
    expect(publicAggregateMajor({ major: resolved.write.major, majorSource: resolved.write.source })).toBeNull();
  });

  it("stores undecided without a public major", () => {
    const resolved = resolveMajorWrite({
      majorSelection: { source: "undecided" },
      exploringMajors: true,
    });
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.write).toMatchObject({
      source: "undecided",
      major: null,
      customMajorText: null,
      exploringMajors: false,
      submission: null,
    });
  });

  it("keeps legacy catalog rows public and hides unknown legacy text", () => {
    expect(publicAggregateMajor({ major: "Mechanical Engineering", majorSource: null })).toBe(
      "Mechanical Engineering",
    );
    expect(publicAggregateMajor({ major: MAJORS[0], majorSource: "catalog" })).toBe(MAJORS[0]);
    expect(publicAggregateMajor({ major: "Historic Preservation", majorSource: null })).toBeNull();
    expect(
      publicAggregateMajor({
        major: "Historic Preservation",
        majorSource: "custom",
      }),
    ).toBeNull();
    expect(publicAggregateMajor({ major: null, majorSource: "undecided" })).toBeNull();

    expect(
      selectionFromStored({ major: "Mechanical Engineering", majorSource: null, customMajorText: null }).source,
    ).toBe("catalog");
    expect(displayMajor({ major: null, majorSource: "undecided", customMajorText: null })).toBe(
      "Undecided / Not sure",
    );
    expect(
      displayMajor({ major: null, majorSource: "custom", customMajorText: "Historic Preservation" }),
    ).toBe("Historic Preservation");
  });

  it("shows suggested majors to undecided students and hides them until a confirmed major opts in", () => {
    const undecided = academicExploration({ source: "undecided", exploringMajors: false, goal: "industry" });
    expect(undecided.visible).toBe(true);
    expect(undecided.suggestions.length).toBeGreaterThan(0);
    expect(undecided.suggestions.every((item) => !/\d+\s*%/.test(item.reason))).toBe(true);
    expect(undecided.suggestions.every((item) => !/fit score|proven|guarantee/i.test(item.reason))).toBe(true);

    const confirmed = academicExploration({ source: "catalog", exploringMajors: false, goal: "industry" });
    expect(confirmed.visible).toBe(false);
    expect(confirmed.suggestions).toEqual([]);

    const exploring = academicExploration({ source: "catalog", exploringMajors: true, goal: "grad_school" });
    expect(exploring.visible).toBe(true);
    expect(exploring.suggestions.map((item) => item.name)).toContain("Biology");

    const noGoal = academicExploration({ source: "undecided", exploringMajors: false, goal: "undecided" });
    expect(noGoal.visible).toBe(true);
    expect(noGoal.suggestions).toEqual([]);
    expect(noGoal.note.toLowerCase()).toContain("pick a goal");
  });
});
