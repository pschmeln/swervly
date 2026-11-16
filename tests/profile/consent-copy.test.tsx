import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ATTRIBUTION } from "@/content/interest-items";
import {
  AttributionCredit,
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
  it("stores answers for the student's own profile and defers aggregated use", () => {
    expect(DATA_USE_CONSENT_LABEL).toBe(
      "I agree that my answers and co-op reviews are stored for my own profile, and may in the future be used without my name to produce aggregated ratings and recommendations for students. I will be asked again before that starts.",
    );
    const html = renderToStaticMarkup(
      <OnboardingFlow initialStep={1} defaults={blankDefaults} />,
    );
    expect(html).toContain(DATA_USE_CONSENT_LABEL);
    expect(html).toContain("School");
    expect(html).toContain("Suggested from your email when we recognize the domain.");
    expect(html).not.toContain(
      "stored and used, without my name, to produce ratings and recommendations",
    );
  });
});

describe("O*NET credit line", () => {
  it("keeps the verbatim sentence and links the license", () => {
    const html = renderToStaticMarkup(<AttributionCredit />);
    const visible = html
      .replace(/<span class="sr-only">[\s\S]*?<\/span>/g, "")
      .replace(/<[^>]+>/g, "");
    expect(visible).toBe(ATTRIBUTION);
    expect(html).toContain(
      'href="https://creativecommons.org/licenses/by-nd/4.0/"',
    );
    expect(html).toContain('href="https://www.onetcenter.org/tools.html"');
    expect(html.match(/target="_blank"/g)).toHaveLength(2);
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(html).toContain(">CC BY-ND 4.0<");
    expect(html).toContain(">O*NET Career Exploration Tools<");
  });
});
