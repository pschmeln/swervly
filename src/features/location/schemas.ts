import { z } from "zod";
import { PLACE_GEOID } from "./places-core";

export const RADIUS_MILES = [25, 50, 100, 250] as const;
export type RadiusMiles = (typeof RADIUS_MILES)[number];

export const PlaceSearchQuery = z.object({
  q: z.string().trim().min(2, { error: "Type at least 2 letters." }).max(80),
});

export const PlaceGeoid = z.string().regex(PLACE_GEOID, { error: "Pick a city from the list." });

export const RadiusInput = z.union(RADIUS_MILES.map((miles) => z.literal(miles)), {
  error: "Choose how far you'd go.",
});
