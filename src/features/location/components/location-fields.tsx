"use client";

import { Checkbox, Field, Select } from "@/components/ui";
import { RADIUS_MILES } from "@/features/location/schemas";
import { LOCATION_FIELD_COPY, type LocationInput } from "@/features/location/write";
import type { LocationValue } from "@/features/location/value";
import { PlaceSearch } from "./place-search";

// Server pages import these from "@/features/location/value", never from this client module.
export { EMPTY_LOCATION, type LocationValue } from "@/features/location/value";

export const RADIUS_OPTIONS = RADIUS_MILES.map((miles) => ({ value: String(miles), label: `Within ${miles} miles` }));

export function locationPayload(value: LocationValue): LocationInput {
  return {
    homePlaceGeoid: value.openToAnywhere ? null : (value.home?.geoid ?? null),
    radiusMiles: value.openToAnywhere || value.radiusMiles === "" ? null : Number(value.radiusMiles),
    openToAnywhere: value.openToAnywhere,
    openToRemote: value.openToRemote,
  };
}

/** Same rule as the server: a city and a radius, unless open to anywhere. */
export function locationErrors(value: LocationValue): Record<string, string> {
  if (value.openToAnywhere) return {};
  const errors: Record<string, string> = {};
  if (!value.home) errors.homePlaceGeoid = LOCATION_FIELD_COPY.homePlaceGeoid;
  if (value.radiusMiles === "") errors.radiusMiles = LOCATION_FIELD_COPY.radiusMiles;
  return errors;
}

export const LOCATION_KEYS = ["homePlaceGeoid", "radiusMiles", "openToAnywhere", "openToRemote"] as const;

/** Home city, radius, Open to anywhere, Open to remote (item 3). Used in onboarding and Profile. */
export function LocationFields({
  value,
  onChange,
  errors,
  disabled,
}: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  errors: Record<string, string | undefined>;
  disabled?: boolean;
}) {
  return (
    <fieldset className="grid gap-4">
      <legend className="text-sm font-semibold text-ink">Where do you want to work?</legend>
      <p className="-mt-2 text-sm text-ink-3">
        Swervly lists companies headquartered in your area first. Nothing is hidden.
      </p>
      <Checkbox
        id="openToAnywhere"
        name="openToAnywhere"
        checked={value.openToAnywhere}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, openToAnywhere: event.target.checked })}
        label="Open to anywhere"
      />
      {value.openToAnywhere ? null : (
        <>
          <PlaceSearch
            id="homePlaceGeoid"
            label="Home city"
            hint="Any US city or town you'd base your search from."
            value={value.home}
            disabled={disabled}
            error={errors.homePlaceGeoid}
            onChange={(home) => onChange({ ...value, home })}
          />
          <Field label="How far would you go?" htmlFor="radiusMiles" error={errors.radiusMiles}>
            <Select
              id="radiusMiles"
              name="radiusMiles"
              value={value.radiusMiles}
              options={RADIUS_OPTIONS}
              placeholder="Choose a distance"
              disabled={disabled}
              onChange={(radiusMiles) => onChange({ ...value, radiusMiles })}
            />
          </Field>
        </>
      )}
      <Checkbox
        id="openToRemote"
        name="openToRemote"
        checked={value.openToRemote}
        disabled={disabled}
        onChange={(event) => onChange({ ...value, openToRemote: event.target.checked })}
        label="Open to remote work"
      />
    </fieldset>
  );
}
