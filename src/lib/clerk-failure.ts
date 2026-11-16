import { isClerkAPIResponseError } from "@clerk/nextjs/errors";

const CLERK_ERROR_CODE = /^[a-z0-9_]{1,64}$/;

export function clerkFailureDetail(error: unknown): string {
  if (isClerkAPIResponseError(error)) {
    const code = error.errors[0]?.code;
    if (typeof code === "string" && CLERK_ERROR_CODE.test(code)) return code;
    if (typeof error.status === "number" && error.status >= 100 && error.status <= 599) {
      return `http_${error.status}`;
    }
    return "clerk_api";
  }

  if (error instanceof Error) {
    const message = error.message;
    if (message.includes("Missing secretKey") || message.includes("CLERK_SECRET_KEY")) {
      return "missing_secret_key";
    }
    if (message.includes("publishableKey") || message.includes("CLERK_PUBLISHABLE_KEY")) {
      return "publishable_key";
    }
    if (message.startsWith("Clerk:") || message.includes("@clerk")) return "clerk_error";
  }

  return "unknown";
}
