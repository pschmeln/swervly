import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { COMPANIES } from "@/content/companies";
import { COMPANY_HQ } from "@/content/places/company-hq";
import { US_PLACES } from "@/content/places/us-places";
import { homeAreaFrom, nearbyLine, rankByHomeArea } from "@/features/location/area";
import { buildPlaceIndex, findPlaceByLabel, milesBetween, normalizePlaceText, placeLabel, searchPlaces } from "@/features/location/places-core";
import { findPlaces, placeByGeoid } from "@/features/location/places";
import { resolveLocationWrite, resolveWorkPlace } from "@/features/location/write";

const index = buildPlaceIndex(US_PLACES);
const labels = (query: string) => findPlaces(query).map(placeLabel);

describe("US places", () => {
  it("has every state, unique geoids and unique names within a state", () => {
    expect(index.places.length).toBeGreaterThan(30000);
    expect(new Set(index.places.map((p) => p.state)).size).toBeGreaterThanOrEqual(51);
    expect(index.byGeoid.size).toBe(index.places.length);
    const keys = index.places.map((p, i) => `${p.state}|${index.keys[i]}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const place of index.places) {
      expect(place.geoid).toMatch(/^\d{7}$/);
      expect(place.name).not.toMatch(/[|,]| CDP$| city$/);
      expect(Math.abs(place.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(place.lng)).toBeLessThanOrEqual(180);
    }
  });

  it("finds cities however students type them", () => {
    expect(labels("Cincinnati")[0]).toBe("Cincinnati, OH");
    expect(labels("dayton, oh")[0]).toBe("Dayton, OH");
    expect(labels("Dayton Ohio")[0]).toBe("Dayton, OH");
    expect(labels("Columbus")[0]).toBe("Columbus, OH");
    expect(labels("saint louis mo")[0]).toBe("St. Louis, MO");
    expect(labels("St. Paul, MN")[0]).toBe("St. Paul, MN");
    expect(labels("Nashville")).toContain("Nashville, TN");
    expect(labels("Louisville, KY")[0]).toBe("Louisville, KY");
    expect(labels("New York")[0]).toBe("New York, NY");
    expect(labels("anasco")[0]).toMatch(/^Añasco/);
    expect(labels("Springfield").length).toBe(8);
    expect(labels("zz")).toEqual([]);
    expect(labels("q")).toEqual([]);
  });

  it("looks up a place by geoid and refuses anything else", () => {
    expect(placeByGeoid("3915000")).toMatchObject({ name: "Cincinnati", state: "OH" });
    expect(placeByGeoid("9999999")).toBeNull();
    expect(placeByGeoid("39150")).toBeNull();
  });

  it("measures distance in miles", () => {
    const cincinnati = placeByGeoid("3915000")!;
    const dayton = findPlaceByLabel(index, "Dayton, OH")!;
    expect(milesBetween(cincinnati, dayton)).toBeGreaterThan(40);
    expect(milesBetween(cincinnati, dayton)).toBeLessThan(55);
    expect(milesBetween(cincinnati, cincinnati)).toBe(0);
  });

  it("keeps company headquarters coordinates in step with companies.ts", () => {
    const aliases: Record<string, string> = { "Boise, ID": "Boise City, ID", "Mayfield Village, OH": "Mayfield, OH" };
    for (const company of COMPANIES) {
      const place = company.city ? findPlaceByLabel(index, aliases[company.city] ?? company.city) : null;
      const hq = COMPANY_HQ[company.id];
      if (place) expect(hq, company.id).toEqual([place.lat, place.lng]);
      else expect(hq, company.id).toBeUndefined();
    }
    expect(Object.keys(COMPANY_HQ).length).toBeGreaterThan(190);
  });

  it("normalizes text for matching", () => {
    expect(normalizePlaceText("Mt. Pleasant")).toBe("mount pleasant");
    expect(normalizePlaceText("Ft Wayne")).toBe("fort wayne");
    expect(normalizePlaceText("Saint Paul")).toBe("st paul");
    expect(searchPlaces(index, "Ft Wayne").map(placeLabel)[0]).toBe("Fort Wayne, IN");
  });
});

describe("saving location", () => {
  const lookup = (geoid: string) => index.byGeoid.get(geoid) ?? null;

  it("requires a city and radius unless open to anywhere", () => {
    expect(resolveLocationWrite({ openToAnywhere: false, openToRemote: false }, lookup)).toEqual({
      ok: false,
      fields: { homePlaceGeoid: expect.any(String), radiusMiles: expect.any(String) },
    });
    expect(resolveLocationWrite({ homePlaceGeoid: "0000000", radiusMiles: 50, openToAnywhere: false, openToRemote: false }, lookup).ok).toBe(false);
    const saved = resolveLocationWrite({ homePlaceGeoid: "3915000", radiusMiles: 50, openToAnywhere: false, openToRemote: true }, lookup);
    expect(saved).toEqual({
      ok: true,
      write: { homePlaceGeoid: "3915000", homeLabel: "Cincinnati, OH", homeLat: 39.1402, homeLng: -84.5058, radiusMiles: 50, openToAnywhere: false, openToRemote: true },
    });
  });

  it("drops the city when open to anywhere, and takes label and point from the place, not the client", () => {
    const write = resolveLocationWrite({ homePlaceGeoid: "3915000", radiusMiles: 25, openToAnywhere: true, openToRemote: false }, lookup);
    expect(write).toMatchObject({ ok: true, write: { homePlaceGeoid: null, homeLabel: null, radiusMiles: null, openToAnywhere: true } });
  });

  it("treats the work city as optional", () => {
    expect(resolveWorkPlace(null, lookup)).toEqual({ ok: true, geoid: null, label: null });
    expect(resolveWorkPlace("3915000", lookup)).toEqual({ ok: true, geoid: "3915000", label: "Cincinnati, OH" });
    expect(resolveWorkPlace("0000000", lookup).ok).toBe(false);
  });
});

describe("ranking companies by home area", () => {
  const area = homeAreaFrom({ homeLabel: "Cincinnati, OH", homeLat: 39.1402, homeLng: -84.5058, radiusMiles: 50, openToAnywhere: false })!;
  const items = COMPANIES.map((company) => ({ id: company.id, name: company.name }));

  it("boosts companies headquartered inside the radius and never removes any", () => {
    const ranked = rankByHomeArea(items, area);
    expect(ranked).toHaveLength(items.length);
    expect(new Set(ranked.map((item) => item.id))).toEqual(new Set(items.map((item) => item.id)));
    const inside = ranked.filter((item) => item.nearby);
    expect(inside.length).toBeGreaterThan(0);
    expect(ranked.slice(0, inside.length).every((item) => item.nearby === "Headquartered within 50 miles of Cincinnati, OH")).toBe(true);
    expect(inside.map((item) => item.id)).toContain("pg");
    expect(nearbyLine(area)).toBe("Headquartered within 50 miles of Cincinnati, OH");
  });

  it("leaves the order alone for open to anywhere or no city", () => {
    expect(homeAreaFrom({ homeLabel: "Cincinnati, OH", homeLat: 39.14, homeLng: -84.5, radiusMiles: 50, openToAnywhere: true })).toBeNull();
    expect(homeAreaFrom({ homeLabel: null, homeLat: null, homeLng: null, radiusMiles: null, openToAnywhere: false })).toBeNull();
    expect(rankByHomeArea(items, null).map((item) => item.id)).toEqual(items.map((item) => item.id));
  });

  it("keeps place data out of client code", () => {
    for (const file of ["src/features/location/area.ts", "src/features/location/components/place-search.tsx", "src/features/location/components/location-fields.tsx", "src/features/atlas/components/atlas-explorer.tsx"]) {
      const source = readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source, file).not.toMatch(/us-places|location\/places"/);
    }
  });
});
