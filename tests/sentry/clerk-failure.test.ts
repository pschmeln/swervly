import { ClerkAPIResponseError } from "@clerk/nextjs/errors";
import { describe, expect, it } from "vitest";
import { clerkFailureDetail } from "@/lib/clerk-failure";

describe("clerkFailureDetail", () => {
  const fakeLiveKey = ["sk", "live", "example"].join("_");
  const fakeTestKey = ["sk", "test", "example"].join("_");

  it("returns a clerk error code and not the message", () => {
    const error = new ClerkAPIResponseError(`secret ${fakeLiveKey} student@mail.uc.edu`, {
      status: 401,
      data: [{ code: "authorization_invalid", message: "student@mail.uc.edu" }],
    });

    expect(clerkFailureDetail(error)).toBe("authorization_invalid");
  });

  it("maps a missing secret key without copying the message", () => {
    const error = new Error(`Clerk: Missing secretKey. The value was ${fakeTestKey}`);
    expect(clerkFailureDetail(error)).toBe("missing_secret_key");
  });

  it("returns unknown for an unrelated error", () => {
    expect(clerkFailureDetail(new Error("connection refused"))).toBe("unknown");
  });
});
