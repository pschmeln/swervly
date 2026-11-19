/**
 * Career Atlas prototype switch.
 * On locally and on Vercel preview deployments; off in production until the
 * founders have reviewed the editorial grouping and approved the launch.
 */
export function atlasPrototypeEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return env.VERCEL_ENV !== "production";
}
