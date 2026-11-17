import { NextResponse } from "next/server";
import { INVITE_COOKIE, normalizeInviteId } from "@/lib/invites";
import { ROUTES } from "@/lib/constants";

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> },
) {
  const { userId } = await context.params;
  const destination = new URL(ROUTES.signUp, request.url);
  const response = NextResponse.redirect(destination);
  const inviteId = normalizeInviteId(userId);
  if (inviteId) {
    response.cookies.set(INVITE_COOKIE, inviteId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
