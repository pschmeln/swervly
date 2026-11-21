import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  DATA_USE_CONSENT_LABEL,
  OnboardingFlow,
  SHARE_REVIEWS_CONSENT_LABEL,
  stepOneErrors,
  type OnboardingDefaults,
} from "@/features/profile/components/onboarding-flow";
import { QUIZ_EXPLORATORY_DISCLAIMER } from "@/content/mini-ipip";
import { ProfileInput } from "@/features/profile/schemas";
import { MAJORS } from "@/lib/constants";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}));

const blankDefaults: OnboardingDefaults = {
  consentPrivacy: false,
  consentDataUse: false,
  consentShareReviews: false,
  school: "",
  major: { source: "catalog", name: "" },
  exploringMajors: false,
  year: "",
  goal: "",
  goalNotes: "",
  locationConstraint: "",
  constraintsNotes: "",
};

const readyWithoutShare: OnboardingDefaults = {
  consentPrivacy: true,
  consentDataUse: true,
  consentShareReviews: false,
  school: "University of Cincinnati",
  major: { source: "catalog", name: MAJORS[0] },
  exploringMajors: false,
  year: "3",
  goal: "industry",
  goalNotes: "",
  locationConstraint: "anywhere",
  constraintsNotes: "",
};

describe("data-use consent copy", () => {
  it("separates required storage consent from optional public sharing consent", () => {
    expect(DATA_USE_CONSENT_LABEL).toContain("stored");
    expect(DATA_USE_CONSENT_LABEL).not.toContain("company pages");
    expect(SHARE_REVIEWS_CONSENT_LABEL).toMatch(/^Optional:/);
    expect(SHARE_REVIEWS_CONSENT_LABEL).toContain("anonymous company pages");
    // Pages need 2 students (since Nov 18, 2026); pay needs 3 (since Nov 21, 2026).
    expect(SHARE_REVIEWS_CONSENT_LABEL).toContain("at least 2 different students in that major");
    expect(SHARE_REVIEWS_CONSENT_LABEL).toContain("Pay ranges need 3 different students");
    expect(SHARE_REVIEWS_CONSENT_LABEL).toContain("Settings");
    expect(SHARE_REVIEWS_CONSENT_LABEL).not.toContain("UC students");
    expect(SHARE_REVIEWS_CONSENT_LABEL).not.toContain("in the future");
    const basics = renderToStaticMarkup(
      <OnboardingFlow initialStep={1} defaults={blankDefaults} />,
    );
    expect(basics).toContain(DATA_USE_CONSENT_LABEL);
    expect(basics).toContain(SHARE_REVIEWS_CONSENT_LABEL);
    const quiz = renderToStaticMarkup(
      <OnboardingFlow initialStep={3} defaults={blankDefaults} />,
    );
    expect(quiz).toContain("About you");
    expect(quiz).toContain(QUIZ_EXPLORATORY_DISCLAIMER);
    expect(quiz).not.toContain("O*NET");
  });
});

describe("optional share-reviews consent", () => {
  it("lets step one succeed when sharing is declined", () => {
    expect(stepOneErrors(readyWithoutShare)).toEqual({});
    expect(stepOneErrors({ ...readyWithoutShare, consentShareReviews: true })).toEqual({});
    expect(stepOneErrors({ ...readyWithoutShare, consentPrivacy: false }).consentPrivacy).toBeTruthy();
    expect(stepOneErrors({ ...readyWithoutShare, consentDataUse: false }).consentDataUse).toBeTruthy();
  });

  it("accepts a profile save payload without granting share-reviews consent", () => {
    const parsed = ProfileInput.safeParse({
      school: readyWithoutShare.school,
      major: MAJORS[0],
      year: Number(readyWithoutShare.year),
      goal: readyWithoutShare.goal,
      locationConstraint: readyWithoutShare.locationConstraint,
      consentPrivacy: true,
      consentDataUse: true,
      consentShareReviews: false,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.consentShareReviews).toBe(false);
  });
});
