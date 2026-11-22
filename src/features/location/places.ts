import { US_PLACES } from "@/content/places/us-places";
import { buildPlaceIndex, PLACE_GEOID, searchPlaces, type Place, type PlaceIndex } from "./places-core";

/**
 * Server-side access to the US places list. Never import this from a client component:
 * it pulls in about 1 MB of place data. Client code calls GET /api/places instead.
 */
let index: PlaceIndex | null = null;

function placeIndex(): PlaceIndex {
  index ??= buildPlaceIndex(US_PLACES);
  return index;
}

export function placeByGeoid(geoid: string): Place | null {
  if (!PLACE_GEOID.test(geoid)) return null;
  return placeIndex().byGeoid.get(geoid) ?? null;
}

export function findPlaces(query: string): Place[] {
  return searchPlaces(placeIndex(), query);
}
