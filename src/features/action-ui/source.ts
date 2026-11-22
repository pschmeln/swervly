export type ActionDataSource = "mock" | "api";

export const PREVIEWS = ["filled", "empty", "empty-pursuing", "unavailable", "error", "gap"] as const;
export type ActionPreview = (typeof PREVIEWS)[number];

/**
 * Local development uses mock data unless ACTION_UI_SOURCE=api.
 * Every other environment calls the API, so a preview never shows a fake plan.
 */
export function resolveActionSource(env: {
  NODE_ENV?: string;
  ACTION_UI_SOURCE?: string;
}): ActionDataSource {
  if (env.NODE_ENV !== "development") return "api";
  if (env.ACTION_UI_SOURCE === "api") return "api";
  return "mock";
}

/** Preview fixtures apply only while the mock source is active. */
export function resolvePreview(
  source: ActionDataSource,
  value: string | string[] | undefined,
): ActionPreview {
  if (source !== "mock") return "filled";
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw && (PREVIEWS as readonly string[]).includes(raw)) return raw as ActionPreview;
  return "filled";
}
