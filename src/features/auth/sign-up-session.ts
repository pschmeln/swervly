/**
 * Clerk Core 3: after email verification, `signUp.status` becomes `"complete"`
 * before a session exists. Only `signUp.finalize()` (or an already-active
 * `isSignedIn` session) may take the user into the app.
 *
 * @see https://clerk.com/docs/guides/development/custom-flows/authentication/email-password
 */

export type SignUpStatusLike = "missing_requirements" | "complete" | "abandoned" | string | null | undefined;

/** Auto-redirect / "Taking you…" only when Clerk has an active session. */
export function shouldRedirectToApp(isSignedIn: boolean): boolean {
  return isSignedIn === true;
}

/**
 * True when verification finished but finalize has not activated a session yet.
 * UI must not treat this as signed-in, and must not fall back to the credentials form.
 */
export function needsFinalizeBeforeApp(args: {
  status: SignUpStatusLike;
  isSignedIn: boolean;
}): boolean {
  return args.status === "complete" && args.isSignedIn !== true;
}

/**
 * Regression helper: the buggy gate was `isSignedIn || status === "complete"`.
 * That must never be used for navigation.
 */
export function wouldPrematureNavigateOnComplete(args: {
  status: SignUpStatusLike;
  isSignedIn: boolean;
}): boolean {
  const buggy = args.isSignedIn || args.status === "complete";
  const correct = shouldRedirectToApp(args.isSignedIn);
  return buggy && !correct;
}
