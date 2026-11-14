import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { handle, ok } from "@/lib/api";
import { apiUser } from "@/lib/auth";

export const GET = handle(async () => {
  const user = await apiUser();
  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  return ok({ user, profile: profile ?? null });
});
