/**
 * Build the US places list used by location search (item 3), and company headquarters
 * coordinates, from the Census Bureau's Gazetteer national places file (public domain).
 *
 *   npx tsx scripts/build-places.ts path/to/2026_Gaz_place_national.txt
 *
 * Writes src/content/places/us-places.ts and src/content/places/company-hq.ts. Nothing is
 * downloaded or sent anywhere. Review the diff before committing. Re-run when a new
 * Gazetteer year comes out, or after a company's headquarters city changes in
 * src/content/companies.ts (tests fail until company-hq.ts matches).
 *
 * Per row: the place name without its legal suffix ("Dayton city" → "Dayton"), state,
 * GEOID and the internal point, rounded to 4 decimals (about 11 m). Rows are ordered
 * incorporated places first, then by land area, so search lists larger places first.
 * When two places in one state share a name, only the first in that order is kept.
 * Companies whose headquarters city is not a Census place (a township or a New England town,
 * for example) get no coordinates; they are listed but never boosted.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { COMPANIES } from "../src/content/companies";
import { buildPlaceIndex, findPlaceByLabel, normalizePlaceText } from "../src/features/location/places-core";

const SOURCE = "U.S. Census Bureau, 2026 Gazetteer Files, national places file";

// LSAD codes for places that are not incorporated: census-designated places (57),
// Puerto Rico comunidades (55) and zonas urbanas (62).
const UNINCORPORATED = new Set(["57", "55", "62"]);

// Longest first, so "city and borough" wins over "borough".
const SUFFIXES = [
  " city and borough",
  " consolidated government",
  " metropolitan government",
  " unified government",
  " metro government",
  " urban county",
  " municipality",
  " zona urbana",
  " corporation",
  " comunidad",
  " borough",
  " village",
  " town",
  " city",
  " CDP",
];

// Consolidated city-county governments, by the name students use for the city.
const COMMON_NAMES: Record<string, string> = {
  "Athens-Clarke County": "Athens",
  "Augusta-Richmond County": "Augusta",
  "Butte-Silver Bow": "Butte",
  "Islamorada, Village of Islands": "Islamorada",
  "Lexington-Fayette": "Lexington",
  "Louisville/Jefferson County": "Louisville",
  "Lynchburg, Moore County": "Lynchburg",
  "Nashville-Davidson": "Nashville",
};

// Headquarters cities in companies.ts written the way people say them, for Census names.
const HQ_ALIASES: Record<string, string> = {
  "Boise, ID": "Boise City, ID",
  "Mayfield Village, OH": "Mayfield, OH",
};

export function placeName(raw: string): string {
  let name = raw.replace(/ \(balance\)$/, "");
  for (const suffix of SUFFIXES) {
    if (name.endsWith(suffix)) {
      name = name.slice(0, -suffix.length);
      break;
    }
  }
  return COMMON_NAMES[name] ?? name;
}

type Row = { geoid: string; name: string; state: string; lat: string; lng: string; incorporated: boolean; land: number };

function readGazetteer(file: string): Row[] {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const header = lines[0]?.split("|") ?? [];
  const col = (name: string) => {
    const index = header.indexOf(name);
    if (index < 0) throw new Error(`Missing column ${name}. Is this the Gazetteer national places file?`);
    return index;
  };
  const [usps, geoid, name, lsad, aland, lat, lng] = ["USPS", "GEOID", "NAME", "LSAD", "ALAND", "INTPTLAT", "INTPTLONG"].map(col);
  const rows: Row[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    const id = cells[geoid!]!;
    if (!/^\d{7}$/.test(id)) throw new Error(`Bad GEOID ${id}`);
    const cleaned = placeName(cells[name!]!);
    if (/[|,]/.test(cleaned)) throw new Error(`Bad name ${cleaned}`);
    rows.push({
      geoid: id,
      name: cleaned,
      state: cells[usps!]!,
      lat: Number(cells[lat!]).toFixed(4),
      lng: Number(cells[lng!]).toFixed(4),
      incorporated: !UNINCORPORATED.has(cells[lsad!]!),
      land: Number(cells[aland!]),
    });
  }
  return rows;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: npx tsx scripts/build-places.ts path/to/2026_Gaz_place_national.txt");
    process.exit(1);
  }
  const all = readGazetteer(file);
  all.sort(
    (a, b) =>
      Number(b.incorporated) - Number(a.incorporated) || b.land - a.land || a.geoid.localeCompare(b.geoid),
  );
  const seen = new Set<string>();
  const kept: Row[] = [];
  for (const row of all) {
    const key = `${row.state}|${normalizePlaceText(row.name)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(row);
  }
  const text = kept.map((row) => [row.geoid, row.name, row.state, row.lat, row.lng].join("|")).join("\n");
  if (text.includes("`") || text.includes("${")) throw new Error("Unexpected character in place names.");

  const root = path.join(__dirname, "..", "src", "content", "places");
  writeFileSync(
    path.join(root, "us-places.ts"),
    [
      "// Generated by scripts/build-places.ts. Do not edit by hand.",
      `// Source: ${SOURCE} (public domain).`,
      "// Server only: never import from a client component (about 1 MB).",
      "",
      `export const US_PLACES_SOURCE = ${JSON.stringify(SOURCE)};`,
      "",
      "/** geoid|name|ST|lat|lng, one place per line, in search ranking order. */",
      `export const US_PLACES = \`${text}\`;`,
      "",
    ].join("\n"),
  );

  const index = buildPlaceIndex(text);
  const hq: string[] = [];
  const unmatched: string[] = [];
  for (const company of COMPANIES) {
    if (!company.city) continue;
    const place = findPlaceByLabel(index, HQ_ALIASES[company.city] ?? company.city);
    if (!place) {
      unmatched.push(`${company.id} (${company.city})`);
      continue;
    }
    hq.push(`  ${JSON.stringify(company.id)}: [${place.lat}, ${place.lng}],`);
  }
  writeFileSync(
    path.join(root, "company-hq.ts"),
    [
      "// Generated by scripts/build-places.ts from src/content/companies.ts. Do not edit by hand.",
      `// Coordinates: ${SOURCE} (public domain), the internal point of the headquarters city.`,
      "",
      "/** Company id → [lat, lng] of its headquarters city. Companies without a matched city are absent. */",
      "export const COMPANY_HQ: Readonly<Record<string, readonly [number, number]>> = {",
      ...hq,
      "};",
      "",
    ].join("\n"),
  );

  console.log(`Places: ${kept.length} kept of ${all.length} (${all.length - kept.length} same-name duplicates dropped).`);
  console.log(`Company headquarters matched: ${hq.length}. Not a Census place: ${unmatched.length}.`);
  for (const entry of unmatched) console.log(`  ${entry}`);
}

main();
