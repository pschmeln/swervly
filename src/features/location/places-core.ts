/**
 * US places (cities, towns, villages and census-designated places) from the Census Bureau's
 * Gazetteer, and the pure search and distance helpers used by location (item 3).
 *
 * Pure: no database, no network. src/features/location/places.ts builds the index once from
 * the generated src/content/places/us-places.ts; scripts/build-places.ts builds it from the
 * raw Gazetteer file. Neither the index nor the generated module may be imported by client
 * components (about 1 MB).
 */

export type Place = {
  /** Census place GEOID: 2-digit state FIPS + 5-digit place code. */
  geoid: string;
  name: string;
  /** Two-letter USPS code. */
  state: string;
  lat: number;
  lng: number;
};

export type PlaceIndex = {
  places: readonly Place[];
  /** Normalized names, same order as places. */
  keys: readonly string[];
  byGeoid: ReadonlyMap<string, Place>;
};

export const PLACE_GEOID = /^\d{7}$/;

/** Search results returned per query. */
export const PLACE_RESULTS_MAX = 8;

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas",
  KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
  MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana",
  NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico",
  NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico",
};

/** Lower-case, no accents or punctuation; "Saint"/"St." → "st", "Mt" → "mount", "Ft" → "fort". */
export function normalizePlaceText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[.'’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\bsaint\b/g, "st")
    .replace(/\bmt\b/g, "mount")
    .replace(/\bft\b/g, "fort");
}

const STATE_BY_KEY = new Map<string, string>();
for (const [code, name] of Object.entries(STATE_NAMES)) {
  STATE_BY_KEY.set(code.toLowerCase(), code);
  STATE_BY_KEY.set(normalizePlaceText(name), code);
}

/** "OH", "oh" or "Ohio" → "OH". Null for anything else. */
export function stateCode(value: string): string | null {
  return STATE_BY_KEY.get(normalizePlaceText(value)) ?? null;
}

export function placeLabel(place: Pick<Place, "name" | "state">): string {
  return `${place.name}, ${place.state}`;
}

/** Rows are `geoid|name|ST|lat|lng`, one per line, in ranking order. */
export function buildPlaceIndex(rows: string): PlaceIndex {
  const places: Place[] = [];
  const keys: string[] = [];
  const byGeoid = new Map<string, Place>();
  for (const line of rows.split("\n")) {
    if (!line) continue;
    const [geoid, name, state, lat, lng] = line.split("|");
    if (!geoid || !name || !state || lat === undefined || lng === undefined) {
      throw new Error("place_row_invalid");
    }
    const place: Place = { geoid, name, state, lat: Number(lat), lng: Number(lng) };
    places.push(place);
    keys.push(normalizePlaceText(name));
    byGeoid.set(geoid, place);
  }
  return { places, keys, byGeoid };
}

type ParsedQuery = { name: string; state: string | null };

/** "Dayton, OH", "dayton oh", "Dayton Ohio" → name and state; otherwise the whole text as a name. */
export function parsePlaceQuery(query: string): ParsedQuery[] {
  const comma = query.lastIndexOf(",");
  if (comma >= 0) {
    const name = normalizePlaceText(query.slice(0, comma));
    const state = stateCode(query.slice(comma + 1));
    if (name && state) return [{ name, state }];
    if (name) return [{ name, state: null }];
  }
  const whole = normalizePlaceText(query);
  const words = whole.split(" ");
  const options: ParsedQuery[] = [];
  // Try a trailing state of one to three words ("oh", "ohio", "new hampshire", "district of columbia").
  for (let count = Math.min(3, words.length - 1); count >= 1; count -= 1) {
    const state = stateCode(words.slice(-count).join(" "));
    if (state) {
      options.push({ name: words.slice(0, -count).join(" "), state });
      break;
    }
  }
  options.push({ name: whole, state: null });
  return options;
}

function tier(key: string, name: string): number {
  if (key === name) return 0;
  if (key.startsWith(name)) return 1;
  if (key.includes(` ${name}`)) return 2;
  return -1;
}

/**
 * Up to PLACE_RESULTS_MAX places for what a student typed. Exact names first, then names
 * that start with it, then names with a word that starts with it. Ties keep index order:
 * incorporated places before census-designated places, larger land area first.
 */
export function searchPlaces(index: PlaceIndex, query: string, max = PLACE_RESULTS_MAX): Place[] {
  for (const option of parsePlaceQuery(query)) {
    if (option.name.length < 2) continue;
    const buckets: Place[][] = [[], [], []];
    for (let i = 0; i < index.places.length; i += 1) {
      const place = index.places[i]!;
      if (option.state && place.state !== option.state) continue;
      const rank = tier(index.keys[i]!, option.name);
      if (rank < 0 || buckets[rank]!.length >= max) continue;
      buckets[rank]!.push(place);
    }
    const found = buckets.flat().slice(0, max);
    if (found.length > 0) return found;
  }
  return [];
}

/** The place a "City, ST" label names: same normalized name and state. First in index order. */
export function findPlaceByLabel(index: PlaceIndex, label: string): Place | null {
  const comma = label.lastIndexOf(",");
  if (comma < 0) return null;
  const name = normalizePlaceText(label.slice(0, comma));
  const state = stateCode(label.slice(comma + 1));
  if (!name || !state) return null;
  for (let i = 0; i < index.places.length; i += 1) {
    if (index.places[i]!.state === state && index.keys[i] === name) return index.places[i]!;
  }
  return null;
}

const EARTH_RADIUS_MILES = 3958.8;

/** Great-circle distance in miles (haversine). */
export function milesBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}
