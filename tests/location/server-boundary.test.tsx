import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EMPTY_LOCATION, locationValueFrom } from "@/features/location/value";

/**
 * Profile and Onboarding are Server Components. They must call locationValueFrom
 * from a pure module — never from the "use client" location-fields file — or
 * Next throws: Attempted to call locationValueFrom() from the server.
 */

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  profileRows: [] as unknown[],
  assessmentRows: [] as unknown[],
  majorSearch: { catalog: [], aliases: [] },
  chosen: null as null,
}));

vi.mock("@/lib/auth", () => ({
  requireUser: mocks.requireUser,
}));

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => mocks.profileRows,
          orderBy: () => ({
            limit: async () => mocks.assessmentRows,
          }),
        }),
        orderBy: () => ({
          limit: async () => mocks.assessmentRows,
        }),
      }),
    }),
  },
}));

vi.mock("@/features/majors/load", () => ({
  loadMajorSearchContext: async () => mocks.majorSearch,
}));

vi.mock("@/features/direction/chosen", () => ({
  loadChosenDirection: async () => mocks.chosen,
}));

vi.mock("@/features/atlas/prototype", () => ({
  atlasPrototypeEnabled: () => false,
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
  useRouter: () => ({ push: () => undefined, refresh: () => undefined }),
}));

const storedCity = {
  school: "University of Cincinnati",
  goal: "industry",
  goalNotes: null,
  constraintsNotes: null,
  homePlaceGeoid: "3915000",
  homeLabel: "Cincinnati, OH",
  radiusMiles: 50,
  openToAnywhere: false,
  openToRemote: true,
};

const onboardedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "student@mail.uc.edu",
  school: "mail.uc.edu",
  major: "Computer Science",
  majorSource: "catalog",
  customMajorText: null,
  exploringMajors: false,
  year: 3,
  onboardedAt: new Date("2026-11-20T00:00:00.000Z"),
  consentPrivacyAt: new Date("2026-11-20T00:00:00.000Z"),
  consentDataUseAt: new Date("2026-11-20T00:00:00.000Z"),
  shareReviewsConsentAt: null,
  shareReviewsConsentVersion: null,
};

function pageSource(relative: string): string {
  return readFileSync(path.join(process.cwd(), relative), "utf8");
}

describe("location server/client boundary", () => {
  beforeEach(() => {
    mocks.requireUser.mockReset();
    mocks.profileRows = [];
    mocks.assessmentRows = [];
  });

  it("keeps locationValueFrom in a module without use client", () => {
    const valueModule = pageSource("src/features/location/value.ts");
    expect(valueModule).not.toMatch(/["']use client["']/);
    expect(valueModule).toContain("export function locationValueFrom");
    expect(pageSource("src/features/location/components/location-fields.tsx")).toMatch(/["']use client["']/);
  });

  it("does not import locationValueFrom from the client location-fields file on server pages", () => {
    for (const file of ["src/app/(app)/profile/page.tsx", "src/app/(app)/onboarding/page.tsx"]) {
      const source = pageSource(file);
      expect(source).toContain('from "@/features/location/value"');
      expect(source).not.toContain("location-fields");
      expect(source).toContain("locationValueFrom(");
    }
  });

  it("renders Profile SSR with stored location form initials (no boundary error)", async () => {
    mocks.requireUser.mockResolvedValue(onboardedUser);
    mocks.profileRows = [storedCity];
    mocks.assessmentRows = [];

    const { default: ProfilePage } = await import("@/app/(app)/profile/page");
    const element = await ProfilePage();
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Where do you want to work?");
    expect(html).toContain("Cincinnati, OH");
    expect(html).toContain("Within 50 miles");
    expect(html).toContain("Open to remote work");
    expect(html).not.toContain("locationValueFrom");
    expect(locationValueFrom(storedCity)).toMatchObject({
      home: { geoid: "3915000", label: "Cincinnati, OH" },
      radiusMiles: "50",
      openToRemote: true,
    });
  });

  it("renders Onboarding SSR for /onboarding?retake=1 without a boundary crash", async () => {
    mocks.requireUser.mockResolvedValue(onboardedUser);
    mocks.profileRows = [storedCity];

    const { default: OnboardingPage } = await import("@/app/(app)/onboarding/page");
    // Server page calls locationValueFrom(profile) while building defaults. Resume is step 3
    // (quiz), so location UI is not in the first paint — the crash was the server call itself.
    const element = await OnboardingPage({
      searchParams: Promise.resolve({ retake: "1" }),
    });
    const html = renderToStaticMarkup(element);

    expect(html).toContain("Onboarding");
    expect(html).toContain("About you");
    expect(locationValueFrom(storedCity)).toEqual({
      home: { geoid: "3915000", label: "Cincinnati, OH" },
      radiusMiles: "50",
      openToAnywhere: false,
      openToRemote: true,
    });
  });

  it("passes Open to anywhere / Remote form initials into the onboarding location step", async () => {
    const anywhere = {
      ...storedCity,
      homePlaceGeoid: null,
      homeLabel: null,
      radiusMiles: null,
      openToAnywhere: true,
      openToRemote: true,
    };
    const location = locationValueFrom(anywhere);
    expect(location).toEqual({
      ...EMPTY_LOCATION,
      openToAnywhere: true,
      openToRemote: true,
    });

    const { OnboardingFlow } = await import("@/features/profile/components/onboarding-flow");
    const html = renderToStaticMarkup(
      <OnboardingFlow
        initialStep={2}
        defaults={{
          consentPrivacy: true,
          consentDataUse: true,
          consentShareReviews: false,
          school: "University of Cincinnati",
          major: { source: "catalog", name: "Computer Science" },
          exploringMajors: false,
          year: "3",
          goal: "industry",
          goalNotes: "",
          location,
          constraintsNotes: "",
        }}
      />,
    );

    expect(html).toContain("Where do you want to work?");
    expect(html).toContain("Open to anywhere");
    expect(html).toContain("Open to remote work");
    expect(html).not.toContain("Home city");
  });
});
