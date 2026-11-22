import type { PlaceOption } from "./components/place-search";

/**
 * Plain data helpers for the location form. No "use client" here on purpose:
 * Profile and Onboarding are server pages and call locationValueFrom while
 * rendering, and a server file cannot call a function from a "use client" module.
 */

export type LocationValue = {
  home: PlaceOption | null;
  /** "" until chosen, else "25" | "50" | "100" | "250". */
  radiusMiles: string;
  openToAnywhere: boolean;
  openToRemote: boolean;
};

export const EMPTY_LOCATION: LocationValue = { home: null, radiusMiles: "", openToAnywhere: false, openToRemote: false };

export function locationValueFrom(stored: {
  homePlaceGeoid: string | null;
  homeLabel: string | null;
  radiusMiles: number | null;
  openToAnywhere: boolean;
  openToRemote: boolean;
} | null | undefined): LocationValue {
  if (!stored) return EMPTY_LOCATION;
  return {
    home: stored.homePlaceGeoid && stored.homeLabel ? { geoid: stored.homePlaceGeoid, label: stored.homeLabel } : null,
    radiusMiles: stored.radiusMiles == null ? "" : String(stored.radiusMiles),
    openToAnywhere: stored.openToAnywhere,
    openToRemote: stored.openToRemote,
  };
}
