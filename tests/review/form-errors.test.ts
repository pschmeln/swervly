import { describe, expect, it } from "vitest";

import {
  apiFormBannerMessage,
  firstFieldControlId,
} from "@/features/review/components/api-client";

describe("apiFormBannerMessage", () => {
  it("keeps the API message near Save when rotationNumber is a field error", () => {
    expect(
      apiFormBannerMessage({
        code: "rotation_number_taken",
        message: "That rotation number is already used.",
        fields: {
          rotationNumber: "That rotation number is already used.",
        },
      }),
    ).toBe("That rotation number is already used.");
  });

  it("keeps the API message for any non-empty fields map", () => {
    expect(
      apiFormBannerMessage({
        code: "invalid_body",
        message: "Invalid request body.",
        fields: { roleTitle: "Role title is required." },
      }),
    ).toBe("Invalid request body.");
  });

  it("uses a field message when the API message is blank", () => {
    expect(
      apiFormBannerMessage({
        code: "rotation_number_taken",
        message: " ",
        fields: { rotationNumber: "That rotation number is already used." },
      }),
    ).toBe("That rotation number is already used.");
  });

  it("keeps a general API message when there are no field errors", () => {
    expect(
      apiFormBannerMessage({
        code: "not_onboarded",
        message: "Finish onboarding first.",
      }),
    ).toBe("Finish onboarding first.");
  });

  it("keeps a general API message when fields is empty", () => {
    expect(
      apiFormBannerMessage({
        code: "server_error",
        message: "Something went wrong.",
        fields: {},
      }),
    ).toBe("Something went wrong.");
  });
});

describe("firstFieldControlId", () => {
  it("points a duplicate rotation number at the rotation control", () => {
    expect(
      firstFieldControlId({
        rotationNumber: "That rotation number is already used.",
      }),
    ).toBe("rotationNumber");
  });

  it("uses form order when several server fields failed", () => {
    expect(
      firstFieldControlId({
        rotationNumber: "That rotation number is already used.",
        roleTitle: "Too short.",
        "review.enjoyment": "Required.",
      }),
    ).toBe("roleTitle");
  });

  it("maps nested review keys and employer keys onto control ids", () => {
    expect(firstFieldControlId({ "review.enjoyment": "Pick one." })).toBe(
      "enjoyment-1",
    );
    expect(
      firstFieldControlId({ employerId: "Select or add an employer." }),
    ).toBe("employer");
    expect(
      firstFieldControlId({ name: "That employer name is not available." }),
    ).toBe("employer");
    expect(firstFieldControlId({ "review.skillsUsed": "Too many." })).toBe(
      "skills-used",
    );
    expect(firstFieldControlId({ "review.freeText": "Too long." })).toBe(
      "freeText",
    );
    expect(
      firstFieldControlId({ "review.shareFreeText": "Needs free text." }),
    ).toBe("shareFreeText");
  });

  it("returns undefined when there is nothing to focus", () => {
    expect(firstFieldControlId(undefined)).toBeUndefined();
    expect(firstFieldControlId({})).toBeUndefined();
    expect(firstFieldControlId({ rotationNumber: "  " })).toBeUndefined();
  });
});
