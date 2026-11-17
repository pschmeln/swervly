import { afterEach, describe, expect, it, vi } from "vitest";
import { captureEvent, posthogConfig } from "@/lib/analytics";

describe("captureEvent", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does nothing when the key is absent", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(posthogConfig()).toBeNull();
    await captureEvent("quiz_finished", "user-1");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the event id and not an email address", async () => {
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_HOST", "https://us.i.posthog.com");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await captureEvent("review_saved", "00000000-0000-4000-8000-000000000001", { action: "create" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.event).toBe("review_saved");
    expect(body.distinct_id).toBe("00000000-0000-4000-8000-000000000001");
    expect(JSON.stringify(body)).not.toContain("@");
    expect(body.properties.action).toBe("create");
  });
});
