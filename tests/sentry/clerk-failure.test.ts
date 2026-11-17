import { ClerkAPIResponseError } from "@clerk/nextjs/errors";
import { describe, expect, it } from "vitest";
import { clerkFailureDetail, isClerkPrerenderFailure } from "@/lib/clerk-failure";

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

  it("recognizes a prerender fetch that Clerk relabeled unexpected_error", () => {
    const prerender = new ClerkAPIResponseError("fetch failed", {
      status: 500,
      data: [
        {
          code: "unexpected_error",
          message:
            "During prerendering, fetch() rejects when the prerender is complete. digest HANGING_PROMISE_REJECTION",
        },
      ],
    });
    const network = new ClerkAPIResponseError("fetch failed", {
      status: 500,
      data: [{ code: "unexpected_error", message: "socket hang up" }],
    });

    expect(clerkFailureDetail(prerender)).toBe("unexpected_error");
    expect(isClerkPrerenderFailure(prerender)).toBe(true);
    expect(isClerkPrerenderFailure(network)).toBe(false);
  });
});
