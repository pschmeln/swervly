/**
 * Career Atlas switch.
 * Turned on in production by the founders on 2026-11-18. To turn the map and
 * the Direction links back off in production, set ATLAS_LIVE to false: it then
 * stays on only locally and on Vercel previews.
 */
export const ATLAS_LIVE = true;

export function atlasPrototypeEnabled(
  env: Readonly<Record<string, string | undefined>> = process.env,
  live: boolean = ATLAS_LIVE,
): boolean {
  return live || env.VERCEL_ENV !== "production";
}
