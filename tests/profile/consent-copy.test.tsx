import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  DATA_USE_CONSENT_LABEL,
  OnboardingFlow,
} from "@/features/profile/components/onboarding-flow";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => undefined }),
}));

const blankDefaults = {
  consentPrivacy: false,
  consentDataUse: false,
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
  it("matches public company views for any .edu student", () => {
    expect(DATA_USE_CONSENT_LABEL).toContain("without my name");
    expect(DATA_USE_CONSENT_LABEL).toContain("3 or more");
    expect(DATA_USE_CONSENT_LABEL).toContain("only if I choose to share");
    expect(DATA_USE_CONSENT_LABEL).not.toContain("UC students");
    expect(DATA_USE_CONSENT_LABEL).not.toContain("in the future");
    const basics = renderToStaticMarkup(
      <OnboardingFlow initialStep={1} defaults={blankDefaults} />,
    );
    expect(basics).toContain(DATA_USE_CONSENT_LABEL);
    const quiz = renderToStaticMarkup(
      <OnboardingFlow initialStep={3} defaults={blankDefaults} />,
    );
    expect(quiz).toContain("About you");
    expect(quiz).not.toContain("O*NET");
  });
});
