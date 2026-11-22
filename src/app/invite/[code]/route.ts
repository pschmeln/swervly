import { NextResponse } from "next/server";
import { INVITE_COOKIE, isLegacyInviteUserId, normalizeReferralCode } from "@/lib/invites";
import { ROUTES } from "@/lib/constants";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  // Old links put users.id in the path. They must not set a cookie.
  if (isLegacyInviteUserId(code)) {
    return NextResponse.redirect(new URL(ROUTES.landing, request.url));
  }

  const destination = new URL(ROUTES.signUp, request.url);
  const response = NextResponse.redirect(destination);
  const referralCode = normalizeReferralCode(code);
  if (referralCode) {
    response.cookies.set(INVITE_COOKIE, referralCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: THIRTY_DAYS,
    });
  }
  return response;
}
