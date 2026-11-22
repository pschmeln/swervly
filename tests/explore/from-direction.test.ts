import { describe, expect, it } from "vitest";
import { buildDirection } from "@/features/direction/rules";
import { DIRECTORY_WHY_SHOWN } from "@/features/explore/companies";
import { DIRECTION_EXHAUSTED_ACTION } from "@/features/direction/rules";
import { directionExploreCopy, PATHS_READY } from "@/features/explore/from-direction";
import { buildExploreModel } from "@/features/explore/view-model";
import type { TraitScores } from "@/features/profile/scoring";

const traits: TraitScores = {
  extraversion: 12,
  agreeableness: 12,
  conscientiousness: 12,
  neuroticism: 12,
  openness: 12,
};

const PRIVATE_MAJOR = "Zq-Private-Major-9f3";

function companyWhy(id: string, model: ReturnType<typeof buildExploreModel>): string {
  return model.companies.find((company) => company.id === id)?.whyShown ?? "";
}

describe("direction explore integration", () => {
  it("keeps a custom major on the profile and out of pathways and companies", () => {
    const model = buildExploreModel({
      stored: { major: null, majorSource: "custom", customMajorText: PRIVATE_MAJOR },
      goal: "industry",
      dismissedRoleIds: [],
      direction: buildDirection({ traits, major: "", goal: "industry" }, []),
    });
    expect(model.profile.majorLabel).toBe(PRIVATE_MAJOR);
    expect(model.profile.note).not.toContain(PRIVATE_MAJOR);
    expect(model.paths.map((path) => path.id)).toEqual(["insufficient"]);
    expect(JSON.stringify({ paths: model.paths, companies: model.companies })).not.toContain(
      PRIVATE_MAJOR,
    );
    expect(model.companies.every((company) => company.whyShown === DIRECTORY_WHY_SHOWN)).toBe(true);
    expect(model.paths.every((path) => path.id !== "software")).toBe(true);
  });

  it("treats undecided and a missing quiz as empty of invented pathways", () => {
    const undecided = buildExploreModel({
      stored: { major: null, majorSource: "undecided", customMajorText: null },
      goal: "undecided",
      dismissedRoleIds: [],
      direction: buildDirection({ traits, major: "", goal: "undecided" }, []),
    });
    expect(undecided.profile.majorLabel).toBe("Undecided / Not sure");
    expect(undecided.profile.goalLabel).toBe("Undecided");
    expect(undecided.paths.map((path) => path.id)).toEqual(["insufficient"]);
    expect(undecided.direction.needsQuiz).toBe(false);
    expect(companyWhy("cchmc", undecided)).toBe(DIRECTORY_WHY_SHOWN);

    const missingQuiz = buildExploreModel({
      stored: { major: "Nursing", majorSource: "catalog", customMajorText: null },
      goal: null,
      dismissedRoleIds: [],
      direction: null,
    });
    expect(missingQuiz.direction.needsQuiz).toBe(true);
    expect(missingQuiz.paths).toEqual([]);
    expect(missingQuiz.pathsIntro).toContain("quiz");
    // The quiz message used to print twice: once as the intro, once as the empty state.
    expect(missingQuiz.pathsEmpty).toBeNull();
    expect(missingQuiz.profile.goalLabel).toBe("Not on your profile yet");
    expect(missingQuiz.profile.majorLabel).toBe("Nursing");
    expect(companyWhy("mayo", missingQuiz)).toBe(DIRECTORY_WHY_SHOWN);
  });

  it("drops dismissed suggestions and does not treat admin or software as clinical", () => {
    const model = buildExploreModel({
      stored: { major: "Nursing", majorSource: "catalog", customMajorText: null },
      goal: "industry",
      dismissedRoleIds: ["healthcare_clinical"],
      direction: {
        label: "Worth exploring from your major and stated goal.",
        suggestions: [
          {
            roleType: "healthcare_clinical",
            roleLabel: "Healthcare — clinical",
            reason: "Clinical work is a place to explore.",
            source: "rules",
            evidenceLabel: "Early hypothesis",
          },
          {
            roleType: "healthcare_admin",
            roleLabel: "Healthcare administration",
            reason: "Administration is a place to explore.",
            source: "rules",
            evidenceLabel: "Early hypothesis",
          },
          {
            roleType: "software",
            roleLabel: "Software",
            reason: "Software is a place to explore.",
            source: "rules",
            evidenceLabel: "Early hypothesis",
          },
        ],
      },
    });
    expect(model.paths.map((path) => path.id)).toEqual(["healthcare_admin", "software"]);
    // The hospitals are tagged with administration too, so they match on that role, never on clinical work.
    expect(companyWhy("cchmc", model)).toBe("Listed under Healthcare administration, which is also one of your direction suggestions.");
    expect(companyWhy("mayo", model)).not.toContain("clinical");
    expect(JSON.stringify(model.companies)).not.toContain("%");
  });

  it("keeps student evidence separate and only overlaps the matching directory category", () => {
    const model = buildExploreModel({
      stored: { major: "Finance", majorSource: "catalog", customMajorText: null },
      goal: "industry",
      dismissedRoleIds: [],
      direction: {
        label: "Worth exploring.",
        suggestions: [
          {
            roleType: "finance",
            roleLabel: "Finance",
            reason: "Worth exploring: 3 students with profiles near yours rated this role highly.",
            source: "similar_students",
            evidenceLabel: "Student evidence · n=3",
          },
          {
            roleType: "business_operations",
            roleLabel: "Business operations",
            reason: "Early hypothesis: operations is a place to explore.",
            source: "rules",
            evidenceLabel: "Early hypothesis",
          },
        ],
      },
    });
    expect(model.paths.map((path) => path.sourceLabel)).toEqual(["Student evidence · n=3", "Early hypothesis"]);
    expect(companyWhy("pnc", model)).toContain("Listed under Finance");
    expect(companyWhy("cleveland-fed", model)).toContain("Listed under Finance");
    expect(companyWhy("pg", model)).toContain("Listed under Business operations");
    expect(companyWhy("ge-aerospace", model)).toBe(DIRECTORY_WHY_SHOWN);
    expect(companyWhy("ideo", model)).toBe(DIRECTORY_WHY_SHOWN);

    const copy = directionExploreCopy({
      stored: { major: null, majorSource: null, customMajorText: null },
      goal: null,
      dismissedRoleIds: ["finance"],
      direction: { label: "Worth exploring.", suggestions: [] },
    });
    expect(copy.paths).toEqual([]);
    expect(copy.direction.exhausted).toBe(true);
    expect(copy.direction.note).toContain("Retake the quiz");
    expect(copy.direction.note).toContain("career map");
  });

  it("says each empty-state message once", () => {
    const dismissedAll = directionExploreCopy({
      stored: { major: "Nursing", majorSource: "catalog", customMajorText: null },
      goal: "industry",
      dismissedRoleIds: ["healthcare_clinical", "healthcare_admin"],
      direction: { label: "Worth exploring.", suggestions: [] },
    });
    const noQuiz = directionExploreCopy({
      stored: { major: "Nursing", majorSource: "catalog", customMajorText: null },
      goal: "industry",
      dismissedRoleIds: [],
      direction: null,
    });
    for (const copy of [dismissedAll, noQuiz]) {
      const shown = [copy.pathsIntro, copy.pathsEmpty].filter(Boolean);
      expect(new Set(shown).size).toBe(shown.length);
      expect(copy.pathsEmpty).toBeNull();
    }
    expect(dismissedAll.pathsIntro).not.toContain("No pathways are listed while those suggestions are dismissed");
  });

  it("puts the pathways explanation only under pathsIntro, not also on direction.note", () => {
    const ready = directionExploreCopy({
      stored: { major: "Nursing", majorSource: "catalog", customMajorText: null },
      goal: "industry",
      dismissedRoleIds: [],
      direction: {
        label: "Worth exploring from your major and stated goal.",
        suggestions: [
          {
            roleType: "healthcare_clinical",
            roleLabel: "Healthcare — clinical",
            reason: "Clinical work is a place to explore.",
            source: "rules",
            evidenceLabel: "Matched to your quiz and major",
          },
        ],
      },
    });
    expect(ready.pathsIntro).toBe(PATHS_READY);
    expect(ready.direction.note).toBe("");
    expect(ready.direction.note).not.toBe(ready.pathsIntro);

    const insufficient = directionExploreCopy({
      stored: { major: null, majorSource: "undecided", customMajorText: null },
      goal: "undecided",
      dismissedRoleIds: [],
      direction: {
        label: "No role stands out yet.",
        suggestions: [
          {
            roleType: "insufficient",
            roleLabel: "Not enough information",
            reason: "Add your major.",
            source: "rules",
            evidenceLabel: "Not enough information",
          },
        ],
      },
    });
    expect(insufficient.direction.note).toContain("not enough information");
    expect(insufficient.pathsIntro).toBe("");
    expect(insufficient.direction.exhausted).toBeFalsy();

    expect(dismissedAllPreserved().direction.exhausted).toBe(true);
    expect(dismissedAllPreserved().direction.note).toBe(DIRECTION_EXHAUSTED_ACTION);
  });
});

function dismissedAllPreserved() {
  return directionExploreCopy({
    stored: { major: "Nursing", majorSource: "catalog", customMajorText: null },
    goal: "industry",
    dismissedRoleIds: ["healthcare_clinical"],
    direction: { label: "Worth exploring.", suggestions: [] },
  });
}
