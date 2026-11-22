/**
 * Shared focus ring: blue, offset, visible on white and on the sky band.
 * Kept out of the "use client" controls module so server components can read
 * the real string (from a client module they would get a client reference).
 */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";
