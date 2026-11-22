import type { Place } from "./places-core";
import { placeLabel } from "./places-core";

/** What the location fields send. The server copies the label and point from the place. */
export type LocationInput = {
  homePlaceGeoid?: string | null;
  radiusMiles?: number | null;
  openToAnywhere: boolean;
  openToRemote: boolean;
};

export type LocationWrite = {
  homePlaceGeoid: string | null;
  homeLabel: string | null;
  homeLat: number | null;
  homeLng: number | null;
  radiusMiles: number | null;
  openToAnywhere: boolean;
  openToRemote: boolean;
};

export const LOCATION_FIELD_COPY = {
  homePlaceGeoid: "Pick your home city from the list, or choose Open to anywhere.",
  radiusMiles: "Choose how far you'd go.",
  workPlaceGeoid: "Pick the city from the list, or leave it empty.",
} as const;

type Lookup = (geoid: string) => Place | null;

/**
 * Open to anywhere: no home city or radius is kept. Otherwise both are required, and the
 * city must be a known place. Pure, so tests can pass their own lookup.
 */
export function resolveLocationWrite(
  input: LocationInput,
  lookup: Lookup,
): { ok: true; write: LocationWrite } | { ok: false; fields: Record<string, string> } {
  if (input.openToAnywhere) {
    return {
      ok: true,
      write: {
        homePlaceGeoid: null,
        homeLabel: null,
        homeLat: null,
        homeLng: null,
        radiusMiles: null,
        openToAnywhere: true,
        openToRemote: input.openToRemote,
      },
    };
  }
  const fields: Record<string, string> = {};
  const place = input.homePlaceGeoid ? lookup(input.homePlaceGeoid) : null;
  if (!place) fields.homePlaceGeoid = LOCATION_FIELD_COPY.homePlaceGeoid;
  if (input.radiusMiles == null) fields.radiusMiles = LOCATION_FIELD_COPY.radiusMiles;
  if (!place || input.radiusMiles == null) return { ok: false, fields };
  return {
    ok: true,
    write: {
      homePlaceGeoid: place.geoid,
      homeLabel: placeLabel(place),
      homeLat: place.lat,
      homeLng: place.lng,
      radiusMiles: input.radiusMiles,
      openToAnywhere: false,
      openToRemote: input.openToRemote,
    },
  };
}

/** Optional work city on a co-op. Null clears it; an unknown place is an error. */
export function resolveWorkPlace(
  geoid: string | null | undefined,
  lookup: Lookup,
): { ok: true; geoid: string | null; label: string | null } | { ok: false; fields: Record<string, string> } {
  if (!geoid) return { ok: true, geoid: null, label: null };
  const place = lookup(geoid);
  if (!place) return { ok: false, fields: { workPlaceGeoid: LOCATION_FIELD_COPY.workPlaceGeoid } };
  return { ok: true, geoid: place.geoid, label: placeLabel(place) };
}
