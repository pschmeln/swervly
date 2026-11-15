import { describe, expect, it } from "vitest";

import { apiFormBannerMessage } from "@/features/review/components/api-client";

describe("apiFormBannerMessage", () => {
  it("hides the bottom banner when rotationNumber is a field error", () => {
    expect(
      apiFormBannerMessage({
        code: "rotation_number_taken",
        message: "You already logged this rotation number.",
        fields: {
          rotationNumber: "You already logged this rotation number.",
        },
      }),
    ).toBeUndefined();
  });

  it("hides the bottom banner for any non-empty fields map", () => {
    expect(
      apiFormBannerMessage({
        code: "validation_error",
        message: "Fix the highlighted fields.",
        fields: { roleTitle: "Role title is required." },
      }),
    ).toBeUndefined();
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
