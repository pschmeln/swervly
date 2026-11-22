import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { homeAreaFrom, type HomeArea } from "./area";

/** The signed-in student's area for ranking companies, or null. Scoped to `userId` from requireUser(). */
export async function loadHomeArea(userId: string): Promise<HomeArea | null> {
  try {
    const [row] = await db
      .select({
        homeLabel: profiles.homeLabel,
        homeLat: profiles.homeLat,
        homeLng: profiles.homeLng,
        radiusMiles: profiles.radiusMiles,
        openToAnywhere: profiles.openToAnywhere,
      })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    return homeAreaFrom(row);
  } catch {
    return null;
  }
}
