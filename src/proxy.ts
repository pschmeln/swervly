import { clerkMiddleware } from "@clerk/nextjs/server";
import type { NextMiddleware } from "next/server";
import { clerkFailureDetail } from "@/lib/clerk-failure";
import { reportFailure } from "@/lib/sentry";

// /account-conflict is not listed. auth.protect() allows a signed-in Clerk
// session through, and that page does not need a users row.
const publicPaths: RegExp[] = [
  /^\/$/,
  /^\/sign-in(.*)/,
  /^\/sign-up(.*)/,
  /^\/not-eligible$/,
  /^\/privacy$/,
  /^\/invite\/(.*)/,
  /^\/\.well-known\/(.*)/,
];

export function isPublicPath(pathname: string): boolean {
  return publicPaths.some((pattern) => pattern.test(pathname));
}

const clerkProxy: NextMiddleware = clerkMiddleware(async (auth, request) => {
  if (!isPublicPath(request.nextUrl.pathname)) {
    await auth.protect();
  }
});

const proxy: NextMiddleware = async (request, event) => {
  try {
    return await clerkProxy(request, event);
  } catch (error) {
    const detail = clerkFailureDetail(error);
    if (detail !== "unknown") {
      reportFailure("clerk_auth_failed", detail, { error });
    }
    throw error;
  }
};

export default proxy;

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
