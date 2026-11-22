import { COMPANY_HQ } from "@/content/places/company-hq";
import { milesBetween } from "./places-core";
import type { RadiusMiles } from "./schemas";

/**
 * The student's area for ranking (item 3, D7): their home city and radius. Companies
 * headquartered inside it are listed first. Nothing is ever hidden. Roles have no location,
 * so only companies are boosted. Client-safe: no place data beyond company headquarters.
 */
export type HomeArea = { label: string; lat: number; lng: number; radiusMiles: RadiusMiles };

export type StoredLocation = {
  homeLabel: string | null;
  homeLat: number | null;
  homeLng: number | null;
  radiusMiles: number | null;
  openToAnywhere: boolean;
};

const RADII: readonly number[] = [25, 50, 100, 250];

/** Null when the student is open to anywhere or has no home city saved. */
export function homeAreaFrom(stored: StoredLocation | null | undefined): HomeArea | null {
  if (!stored || stored.openToAnywhere) return null;
  const { homeLabel, homeLat, homeLng, radiusMiles } = stored;
  if (!homeLabel || homeLat == null || homeLng == null || radiusMiles == null || !RADII.includes(radiusMiles)) {
    return null;
  }
  return { label: homeLabel, lat: homeLat, lng: homeLng, radiusMiles: radiusMiles as RadiusMiles };
}

/** The reason shown on a boosted company. Headquarters only: co-ops may be elsewhere. */
export function nearbyLine(area: HomeArea): string {
  return `Headquartered within ${area.radiusMiles} miles of ${area.label}`;
}

/** Miles from the area's center to the company's headquarters city, or null when unknown. */
export function headquartersMiles(companyId: string, area: HomeArea): number | null {
  const hq = COMPANY_HQ[companyId];
  if (!hq) return null;
  return milesBetween(area, { lat: hq[0], lng: hq[1] });
}

export type Ranked<T> = T & { nearby: string | null };

/**
 * Companies headquartered inside the area first, nearest first. Every other company follows
 * in its original order. Same items in, same items out: a boost, never a filter.
 */
export function rankByHomeArea<T extends { id: string }>(items: readonly T[], area: HomeArea | null): Ranked<T>[] {
  if (!area) return items.map((item) => ({ ...item, nearby: null }));
  const line = nearbyLine(area);
  const inside: { item: Ranked<T>; miles: number; order: number }[] = [];
  const rest: Ranked<T>[] = [];
  items.forEach((item, order) => {
    const miles = headquartersMiles(item.id, area);
    if (miles != null && miles <= area.radiusMiles) inside.push({ item: { ...item, nearby: line }, miles, order });
    else rest.push({ ...item, nearby: null });
  });
  inside.sort((a, b) => a.miles - b.miles || a.order - b.order);
  return [...inside.map((entry) => entry.item), ...rest];
}
