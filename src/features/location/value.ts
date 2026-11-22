/** Form shape for home city / radius / anywhere / remote. Pure — safe on the server. */

export type LocationValue = {
  home: { geoid: string; label: string } | null;
  /** "" until chosen, else "25" | "50" | "100" | "250". */
  radiusMiles: string;
  openToAnywhere: boolean;
  openToRemote: boolean;
};

export const EMPTY_LOCATION: LocationValue = {
  home: null,
  radiusMiles: "",
  openToAnywhere: false,
  openToRemote: false,
};

/** Map a stored profile location row into form initials. */
export function locationValueFrom(
  stored: {
    homePlaceGeoid: string | null;
    homeLabel: string | null;
    radiusMiles: number | null;
    openToAnywhere: boolean;
    openToRemote: boolean;
  } | null | undefined,
): LocationValue {
  if (!stored) return EMPTY_LOCATION;
  return {
    home: stored.homePlaceGeoid && stored.homeLabel ? { geoid: stored.homePlaceGeoid, label: stored.homeLabel } : null,
    radiusMiles: stored.radiusMiles == null ? "" : String(stored.radiusMiles),
    openToAnywhere: stored.openToAnywhere,
    openToRemote: stored.openToRemote,
  };
}
