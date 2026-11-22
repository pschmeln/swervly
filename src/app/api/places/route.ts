import { ApiError, handle } from "@/lib/api";
import { apiUser } from "@/lib/auth";
import { findPlaces } from "@/features/location/places";
import { placeLabel } from "@/features/location/places-core";
import { PlaceSearchQuery } from "@/features/location/schemas";

/**
 * City search for location fields (onboarding, profile, review form). Signed-in only.
 * Public Census data, nothing about the student; the query is never logged or stored.
 */
export const GET = handle(async (req) => {
  await apiUser();
  const parsed = PlaceSearchQuery.safeParse({ q: new URL(req.url).searchParams.get("q") ?? "" });
  if (!parsed.success) {
    throw new ApiError(400, "invalid_query", parsed.error.issues[0]?.message ?? "Type a city name.");
  }
  const places = findPlaces(parsed.data.q).map((place) => ({ geoid: place.geoid, label: placeLabel(place) }));
  return Response.json({ ok: true, data: places }, { headers: { "Cache-Control": "private, max-age=3600" } });
});
