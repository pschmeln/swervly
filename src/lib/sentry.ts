import * as Sentry from "@sentry/nextjs";
import type { Breadcrumb, ErrorEvent, EventHint } from "@sentry/nextjs";
import { clerkFailureDetail } from "@/lib/clerk-failure";
import {
  isInternalUserId,
  safeFailureDetail,
  scrubBreadcrumb,
  scrubSentryEvent,
  scrubString,
  type ScrubbableEvent,
} from "@/lib/sentry-scrub";

const reported = new WeakSet<object>();

export function sentryDsn(): string | undefined {
  const value = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  return value && value.length > 0 ? value : undefined;
}

export function sentryEnabled(): boolean {
  return Boolean(sentryDsn());
}

export function sentryEnvironment(): string {
  return (
    process.env.SENTRY_ENVIRONMENT ||
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.NODE_ENV ||
    "development"
  );
}

export function wasReported(error: unknown): boolean {
  return typeof error === "object" && error !== null && reported.has(error);
}

function remember(error: unknown): void {
  if (typeof error === "object" && error !== null) reported.add(error);
}

export function errorDigest(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("digest" in error)) return undefined;
  const digest = (error as { digest?: unknown }).digest;
  if (typeof digest === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(digest)) return digest;
  return undefined;
}

function sanitizedException(code: string, detail: string | undefined, error: unknown): Error {
  const message = detail ? `${code} ${detail}` : code;
  const wrapped = new Error(message);
  wrapped.name = code;
  if (error instanceof Error && typeof error.stack === "string") {
    const frames = scrubString(error.stack.split("\n").slice(1).join("\n"));
    wrapped.stack = `${wrapped.name}: ${wrapped.message}${frames ? `\n${frames}` : ""}`;
  }
  return wrapped;
}

function isAutoMechanism(event: ErrorEvent): boolean {
  const mechanism = event.exception?.values?.find((value) => value.mechanism)?.mechanism?.type ?? "";
  return (
    mechanism.startsWith("auto") ||
    mechanism === "onerror" ||
    mechanism === "onunhandledrejection" ||
    mechanism === "instrument"
  );
}

export function sentrySharedOptions() {
  const release = process.env.SENTRY_RELEASE || process.env.NEXT_PUBLIC_SENTRY_RELEASE || undefined;
  return {
    dsn: sentryDsn(),
    enabled: sentryEnabled(),
    environment: sentryEnvironment(),
    ...(release ? { release } : {}),
    sendDefaultPii: false as const,
    tracesSampleRate: 0,
    sampleRate: 1,
    enableLogs: false,
    maxBreadcrumbs: 30,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [] as [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
      queues: false,
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
      graphQL: { document: false, variables: false },
    },
    beforeSend(event: ErrorEvent, hint: EventHint) {
      try {
        if (wasReported(hint.originalException) && isAutoMechanism(event)) return null;
        return scrubSentryEvent(event as ScrubbableEvent) as ErrorEvent | null;
      } catch {
        return null;
      }
    },
    beforeBreadcrumb(breadcrumb: Breadcrumb) {
      try {
        return scrubBreadcrumb(breadcrumb);
      } catch {
        return null;
      }
    },
  };
}

type FailureContext = {
  error?: unknown;
  status?: number;
};

export function captureFailure(code: string, detail: string, context?: FailureContext): void {
  const error = context?.error;
  if (wasReported(error)) return;
  remember(error);
  if (!sentryEnabled()) return;

  const safeDetail = safeFailureDetail(detail);
  const digest = errorDigest(error);
  try {
    Sentry.withScope((scope) => {
      scope.setTag("failure_code", code);
      scope.setFingerprint(["{{ default }}", code]);
      if (safeDetail) scope.setExtra("detail", safeDetail);
      if (typeof context?.status === "number") scope.setTag("http_status", String(context.status));
      if (digest) scope.setExtra("digest", digest);
      if (safeDetail && isInternalUserId(safeDetail)) scope.setUser({ id: safeDetail });
      Sentry.captureException(sanitizedException(code, safeDetail, error));
    });
  } catch {
    // Reporting must not change the request outcome.
  }
}

export function markReported(error: unknown): void {
  remember(error);
}

export function reportFailure(code: string, detail: string, context?: FailureContext): void {
  if (wasReported(context?.error)) return;
  console.error(code, detail);
  captureFailure(code, detail, context);
}

export function setInternalUser(userId: string): void {
  if (!isInternalUserId(userId) || !sentryEnabled()) return;
  try {
    Sentry.setUser({ id: userId });
  } catch {
    // Ignore SDK failures.
  }
}

export function clientFailureCode(error: unknown, pathname: string): string {
  if (
    pathname === "/sign-in" ||
    pathname.startsWith("/sign-in/") ||
    pathname === "/sign-up" ||
    pathname.startsWith("/sign-up/")
  ) {
    return "sign_in_failed";
  }
  if (clerkFailureDetail(error) !== "unknown") return "clerk_auth_failed";
  return "client_error";
}

export function reportClientError(error: unknown, pathname: string): void {
  const code = clientFailureCode(error, pathname);
  const detail = error instanceof Error && safeFailureDetail(error.name) ? error.name : "unknown";
  captureFailure(code, detail, { error });
}

export function isRequestControlFlow(error: unknown): boolean {
  if (!(error instanceof Error) || !("digest" in error)) return false;
  const digest = String((error as { digest?: unknown }).digest ?? "");
  return (
    digest.startsWith("NEXT_REDIRECT") ||
    digest === "NEXT_NOT_FOUND" ||
    digest.startsWith("NEXT_HTTP_ERROR_FALLBACK") ||
    digest === "HANGING_PROMISE_REJECTION" ||
    digest === "NEXT_PRERENDER_INTERRUPTED" ||
    digest === "DYNAMIC_SERVER_USAGE" ||
    digest === "BAILOUT_TO_CLIENT_SIDE_RENDERING"
  );
}
