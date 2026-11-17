import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  DATA_USE_CONSENT_LABEL,
  OnboardingFlow,
  SHARE_REVIEWS_CONSENT_LABEL,
} from "@/features/profile/components/onboarding-flow";
import { QUIZ_EXPLORATORY_DISCLAIMER } from "@/content/mini-ipip";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}));

const blankDefaults = {
  consentPrivacy: false,
  consentDataUse: false,
  consentShareReviews: false,
  school: "",
  major: "",
  year: "",
  coopTrack: "",
  goal: "",
  goalNotes: "",
  locationConstraint: "",
  constraintsNotes: "",
};

describe("data-use consent copy", () => {
  it("separates storage consent from versioned public sharing consent", () => {
    expect(DATA_USE_CONSENT_LABEL).toContain("stored");
    expect(DATA_USE_CONSENT_LABEL).not.toContain("company pages");
    expect(SHARE_REVIEWS_CONSENT_LABEL).toContain("anonymous company pages");
    expect(SHARE_REVIEWS_CONSENT_LABEL).toContain("3 different students");
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
