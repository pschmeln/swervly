export type AnalyticsEvent =
  | "sign_up"
  | "quiz_finished"
  | "review_saved"
  | "direction_viewed";

export function posthogConfig(): { key: string; host: string } | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() ?? "";
  if (!key) return null;
  const host = (process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com").replace(/\/$/, "");
  return { key, host };
}

/**
 * Sends one PostHog capture. No-ops when NEXT_PUBLIC_POSTHOG_KEY is unset.
 * distinctId is the internal users.id. Do not pass email, pay, or free text.
 */
export async function captureEvent(
  event: AnalyticsEvent,
  distinctId: string,
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  const config = posthogConfig();
  if (!config || distinctId.trim().length === 0) return;
  try {
    await fetch(`${config.host}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        api_key: config.key,
        event,
        distinct_id: distinctId,
        properties: properties ?? {},
      }),
    });
  } catch {
    // Tracking must not block sign-up, the quiz, a review, or Direction.
  }
}
