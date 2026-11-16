import { describe, expect, it } from "vitest";
import { scrubSentryEvent, scrubString, safeFailureDetail } from "@/lib/sentry-scrub";

const fakeLiveKey = ["sk", "live", "example"].join("_");
const fakeTestKey = ["sk", "test", "example"].join("_");
const userId = "00000000-0000-4000-8000-000000000001";

describe("sentry scrubbing", () => {
  it("keeps a failure code or internal user id and drops anything else", () => {
    expect(safeFailureDetail("clerk_delete_failed")).toBe("clerk_delete_failed");
    expect(safeFailureDetail(userId)).toBe(userId);
    expect(safeFailureDetail("student@mail.uc.edu")).toBeUndefined();
    expect(safeFailureDetail(fakeLiveKey)).toBeUndefined();
  });

  it("redacts emails, clerk keys, clerk user ids, and database urls", () => {
    const scrubbed = scrubString(
      `failed for student@mail.uc.edu user_2abcdef1234567890 ${fakeLiveKey} postgres://role:pw@db.example/app Bearer example.token`,
    );
    expect(scrubbed).not.toContain("student@");
    expect(scrubbed).not.toContain("user_2abcdef");
    expect(scrubbed).not.toContain(fakeLiveKey);
    expect(scrubbed).not.toContain("postgres://");
    expect(scrubbed).not.toContain("example.token");
    expect(scrubbed).toContain("[email]");
  });

  it("keeps only the internal user id and drops request bodies, cookies, and query strings", () => {
    const event = scrubSentryEvent({
      message: "sign-in failed for student@mail.uc.edu",
      user: {
        id: userId,
        email: "student@mail.uc.edu",
        username: "student",
        ip_address: "203.0.113.10",
      },
      request: {
        method: "POST",
        url: "https://app.swervly.com/sign-in?email=student@mail.uc.edu",
        headers: { cookie: "session=secret", authorization: "Bearer token" },
        cookies: { session: "secret" },
        data: { email: "student@mail.uc.edu" },
        query_string: "email=student@mail.uc.edu",
      },
      exception: {
        values: [
          {
            type: "Error",
            value: `invalid ${fakeTestKey} for student@mail.uc.edu`,
          },
        ],
      },
      breadcrumbs: [
        { category: "console", message: "student@mail.uc.edu" },
        { category: "fetch", message: "POST https://api.clerk.com student@mail.uc.edu" },
      ],
    });

    expect(event).not.toBeNull();
    expect(event?.user).toEqual({ id: userId });
    expect(event?.request).toEqual({
      method: "POST",
      url: "https://app.swervly.com/sign-in",
    });
    expect(JSON.stringify(event)).not.toContain("student@");
    expect(JSON.stringify(event)).not.toContain(fakeTestKey);
    expect(JSON.stringify(event)).not.toContain("session");
    expect(event?.breadcrumbs).toEqual([
      { category: "fetch", message: "POST https://api.clerk.com [email]", data: undefined },
    ]);
  });

  it("drops Next.js redirect control-flow errors", () => {
    expect(
      scrubSentryEvent({
        exception: { values: [{ type: "Error", value: "NEXT_REDIRECT" }] },
      }),
    ).toBeNull();
  });
});
