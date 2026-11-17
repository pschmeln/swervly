import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, handle } from "@/lib/api";
import { captureFailure, clientFailureCode, reportFailure } from "@/lib/sentry";

const mocks = vi.hoisted(() => ({
  captureException: vi.fn((error: unknown) => {
    void error;
    return "event";
  }),
}));

vi.mock("next/navigation", () => ({
  unstable_rethrow: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: mocks.captureException,
  withScope: (callback: (scope: {
    setTag: (key: string, value: string) => void;
    setFingerprint: (value: string[]) => void;
    setExtra: (key: string, value: unknown) => void;
    setUser: (user: { id: string }) => void;
  }) => void) => {
    callback({
      setTag: vi.fn(),
      setFingerprint: vi.fn(),
      setExtra: vi.fn(),
      setUser: vi.fn(),
    });
  },
  setUser: vi.fn(),
  init: vi.fn(),
  captureRequestError: vi.fn(),
  captureRouterTransitionStart: vi.fn(),
}));

describe("failure reporting without a DSN", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mocks.captureException.mockClear();
  });

  it("logs the failure code and does not call Sentry", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failure = new ApiError(502, "delete_failed", "try again");

    reportFailure("clerk_delete_failed", "missing_clerk_id", { error: failure, status: 502 });
    reportFailure("clerk_delete_failed", "missing_clerk_id", { error: failure, status: 502 });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith("clerk_delete_failed", "missing_clerk_id");
    expect(mocks.captureException).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("sends a sanitized error once when a DSN is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@o0.ingest.sentry.io/0");
    const fakeLiveKey = ["sk", "live", "example"].join("_");
    const failure = new Error(`student@mail.uc.edu ${fakeLiveKey}`);

    captureFailure("api_error", "Error", { error: failure, status: 500 });
    captureFailure("api_error", "Error", { error: failure, status: 500 });

    expect(mocks.captureException).toHaveBeenCalledTimes(1);
    const sent = mocks.captureException.mock.calls[0]?.[0];
    expect(sent).toBeInstanceOf(Error);
    if (!(sent instanceof Error)) return;
    expect(sent.message).toBe("api_error Error");
    expect(sent.message).not.toContain("@");
    expect(sent.stack ?? "").not.toContain("student@");
    expect(sent.stack ?? "").not.toContain(fakeLiveKey);
  });

  it("names sign-in routes separately from other client errors", () => {
    expect(clientFailureCode(new Error("render"), "/sign-in/factor-one")).toBe("sign_in_failed");
    expect(clientFailureCode(new Error("Clerk: Missing publishableKey"), "/home")).toBe("clerk_auth_failed");
    expect(clientFailureCode(new Error("@clerk/nextjs: Clerk keys are missing from your environment."), "/home")).toBe(
      "clerk_auth_failed",
    );
    expect(clientFailureCode(new Error("render"), "/home")).toBe("client_error");
  });
});

describe("API 5xx reporting", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    mocks.captureException.mockClear();
  });

  it("returns 500 for an unexpected throw and keeps the body free of the cause", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = handle(async () => {
      throw new Error("student@mail.uc.edu connection string postgres://role:secret@host/db");
    });

    const response = await route(new Request("http://localhost/api/me"), { params: Promise.resolve({}) });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: { code: "internal_error", message: "Something went wrong." },
    });
    expect(errorSpy).toHaveBeenCalledWith("api_error", "Error");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("student@");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("postgres://");
    errorSpy.mockRestore();
  });

  it("does not report a 4xx ApiError", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const route = handle(async () => {
      throw new ApiError(401, "unauthorized", "Sign in required.");
    });

    const response = await route(new Request("http://localhost/api/me"), { params: Promise.resolve({}) });

    expect(response.status).toBe(401);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(mocks.captureException).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("reports an ApiError 5xx by its code", async () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://public@o0.ingest.sentry.io/0");
    const route = handle(async () => {
      throw new ApiError(500, "internal_error", "Something went wrong.");
    });

    const response = await route(new Request("http://localhost/api/me"), { params: Promise.resolve({}) });

    expect(response.status).toBe(500);
    expect(mocks.captureException).toHaveBeenCalledTimes(1);
    const sent = mocks.captureException.mock.calls[0]?.[0];
    expect(sent).toBeInstanceOf(Error);
    if (!(sent instanceof Error)) return;
    expect(sent.message).toBe("internal_error 500");
  });
});
