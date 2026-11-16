const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const CLERK_KEY = /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]+\b/g;
const CLERK_USER = /\buser_[A-Za-z0-9]{8,}\b/g;
const DATABASE_URL = /postgres(?:ql)?:\/\/\S+/gi;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const IPV4 = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;

const INTERNAL_USER_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_TOKEN = /^[A-Za-z0-9_]{1,64}$/;

const DROPPED_KEYS = new Set([
  "email",
  "ip_address",
  "username",
  "cookies",
  "cookie",
  "authorization",
  "set-cookie",
  "query_string",
]);

export function isInternalUserId(value: string): boolean {
  return INTERNAL_USER_ID.test(value);
}

export function safeFailureDetail(detail: string | undefined): string | undefined {
  if (!detail) return undefined;
  if (
    detail.includes("@") ||
    /(?:sk|pk)_(?:live|test)_/i.test(detail) ||
    detail.toLowerCase().includes("postgres://") ||
    detail.toLowerCase().includes("bearer ")
  ) {
    return undefined;
  }
  if (SAFE_TOKEN.test(detail) || isInternalUserId(detail)) return detail;
  return undefined;
}

export function scrubString(value: string): string {
  return value
    .replace(EMAIL, "[email]")
    .replace(CLERK_KEY, "[redacted]")
    .replace(CLERK_USER, "[id]")
    .replace(DATABASE_URL, "[redacted]")
    .replace(BEARER, "Bearer [redacted]")
    .replace(IPV4, "[ip]");
}

export type ScrubbableEvent = {
  message?: string;
  user?: { id?: string; email?: string; username?: string; ip_address?: string | null } | null;
  request?: {
    url?: string;
    method?: string;
    headers?: unknown;
    cookies?: unknown;
    data?: unknown;
    query_string?: unknown;
    env?: unknown;
  };
  exception?: {
    values?: Array<{
      type?: string;
      value?: string;
      stacktrace?: unknown;
      mechanism?: { type?: string };
    }>;
  };
  extra?: Record<string, unknown> | null;
  tags?: Record<string, unknown> | null;
  contexts?: Record<string, unknown> | null;
  breadcrumbs?: Array<{
    category?: string;
    message?: string;
    data?: Record<string, unknown>;
  }>;
};

function isControlFlowEvent(event: ScrubbableEvent): boolean {
  const values = event.exception?.values ?? [];
  return values.some((value) => {
    const text = `${value.type ?? ""} ${value.value ?? ""}`;
    return (
      text.includes("NEXT_REDIRECT") ||
      text.includes("NEXT_NOT_FOUND") ||
      text.includes("NEXT_HTTP_ERROR_FALLBACK")
    );
  });
}

function scrubUnknown(value: unknown): unknown {
  if (typeof value === "string") return scrubString(value);
  if (Array.isArray(value)) return value.map((item) => scrubUnknown(item));
  if (value && typeof value === "object") return scrubRecord(value as Record<string, unknown>);
  return value;
}

function scrubRecord(record: Record<string, unknown>): Record<string, unknown> {
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (DROPPED_KEYS.has(key.toLowerCase())) continue;
    next[key] = scrubUnknown(value);
  }
  return next;
}

export function scrubBreadcrumb<B extends { category?: string; message?: string; data?: Record<string, unknown> }>(
  breadcrumb: B,
): B | null {
  if (breadcrumb.category === "console") return null;
  return {
    ...breadcrumb,
    message: typeof breadcrumb.message === "string" ? scrubString(breadcrumb.message) : breadcrumb.message,
    data: breadcrumb.data ? (scrubRecord(breadcrumb.data) as B["data"]) : breadcrumb.data,
  };
}

export function scrubSentryEvent<E extends ScrubbableEvent>(event: E): E | null {
  if (isControlFlowEvent(event)) return null;

  if (event.user) {
    const id = typeof event.user.id === "string" && isInternalUserId(event.user.id) ? event.user.id : undefined;
    event.user = id ? { id } : undefined;
  }

  if (event.request) {
    const method = typeof event.request.method === "string" ? event.request.method : undefined;
    const rawUrl = typeof event.request.url === "string" ? event.request.url.split("?")[0] : undefined;
    event.request = {
      method,
      url: rawUrl ? scrubString(rawUrl) : undefined,
    };
  }

  if (typeof event.message === "string") event.message = scrubString(event.message);
  if (event.extra) event.extra = scrubRecord(event.extra);
  if (event.tags) event.tags = scrubRecord(event.tags);
  if (event.contexts) event.contexts = scrubRecord(event.contexts);
  if (event.exception?.values) {
    for (const value of event.exception.values) {
      if (typeof value.value === "string") value.value = scrubString(value.value);
      if (value.stacktrace) value.stacktrace = scrubUnknown(value.stacktrace);
    }
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.flatMap((breadcrumb) => {
      const scrubbed = scrubBreadcrumb(breadcrumb);
      return scrubbed ? [scrubbed] : [];
    });
  }

  return event;
}
