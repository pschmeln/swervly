import { describe, expect, it } from "vitest";
import { EMPTY_LOCATION, locationValueFrom } from "@/features/location/value";

describe("locationValueFrom", () => {
  it("returns empty form initials when nothing is stored", () => {
    expect(locationValueFrom(null)).toEqual(EMPTY_LOCATION);
    expect(locationValueFrom(undefined)).toEqual(EMPTY_LOCATION);
  });

  it("maps a stored city and distance into form initials", () => {
    expect(
      locationValueFrom({
        homePlaceGeoid: "3915000",
        homeLabel: "Cincinnati, OH",
        radiusMiles: 50,
        openToAnywhere: false,
        openToRemote: false,
      }),
    ).toEqual({
      home: { geoid: "3915000", label: "Cincinnati, OH" },
      radiusMiles: "50",
      openToAnywhere: false,
      openToRemote: false,
    });
  });

  it("keeps Open to anywhere without a city or distance", () => {
    expect(
      locationValueFrom({
        homePlaceGeoid: null,
        homeLabel: null,
        radiusMiles: null,
        openToAnywhere: true,
        openToRemote: false,
      }),
    ).toEqual({
      home: null,
      radiusMiles: "",
      openToAnywhere: true,
      openToRemote: false,
    });
  });

  it("keeps Open to remote alongside a city", () => {
    expect(
      locationValueFrom({
        homePlaceGeoid: "3651000",
        homeLabel: "New York, NY",
        radiusMiles: 25,
        openToAnywhere: false,
        openToRemote: true,
      }),
    ).toEqual({
      home: { geoid: "3651000", label: "New York, NY" },
      radiusMiles: "25",
      openToAnywhere: false,
      openToRemote: true,
    });
  });

  it("drops a partial home when geoid or label is missing", () => {
    expect(
      locationValueFrom({
        homePlaceGeoid: "3915000",
        homeLabel: null,
        radiusMiles: 100,
        openToAnywhere: false,
        openToRemote: false,
      }).home,
    ).toBeNull();
    expect(
      locationValueFrom({
        homePlaceGeoid: null,
        homeLabel: "Cincinnati, OH",
        radiusMiles: 100,
        openToAnywhere: false,
        openToRemote: false,
      }).home,
    ).toBeNull();
  });
});
