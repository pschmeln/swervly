import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";
import { clerkFailureDetail, isClerkPrerenderFailure } from "@/lib/clerk-failure";
import { isRequestControlFlow, wasReported } from "@/lib/sentry";
import { safeFailureDetail } from "@/lib/sentry-scrub";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

function signInPath(path: string): boolean {
  const pathname = path.split("?")[0] ?? "";
  return (
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/sign-up" ||
    pathname.startsWith("/sign-up/")
  );
}

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  if (isRequestControlFlow(error) || isClerkPrerenderFailure(error) || wasReported(error)) return;

  const detail = clerkFailureDetail(error);
  const failureCode =
    detail !== "unknown" ? "clerk_auth_failed" : signInPath(request.path) ? "sign_in_failed" : undefined;
  const safeDetail = safeFailureDetail(detail);

  Sentry.withScope((scope) => {
    if (failureCode) scope.setTag("failure_code", failureCode);
    if (failureCode && safeDetail && safeDetail !== "unknown") scope.setExtra("detail", safeDetail);
    Sentry.captureRequestError(error, request, context);
  });
};
