import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { isCareerRoleId } from "@/features/direction/career-roles";
import { ApiError } from "@/lib/api";

/** Most careers one student can mark Interested. */
export const MAX_INTERESTED_ROLES = 30;

export const InterestRoleInput = z
  .object({
    roleType: z.string().trim().min(1).max(64),
    interested: z.boolean(),
  })
  .refine((input) => isCareerRoleId(input.roleType), {
    path: ["roleType"],
    error: "Choose a career to mark.",
  });

export type InterestRoleInput = z.infer<typeof InterestRoleInput>;

/** The next Interested and dismissed lists after a tap. Pure, so it is easy to test. */
export function nextInterestLists(
  current: { interestedCareerRoles: readonly string[]; dismissedCareerRoles: readonly string[] },
  roleType: string,
  interested: boolean,
): { interestedCareerRoles: string[]; dismissedCareerRoles: string[] } {
  if (!interested) {
    return {
      interestedCareerRoles: current.interestedCareerRoles.filter((role) => role !== roleType),
      dismissedCareerRoles: [...current.dismissedCareerRoles],
    };
  }
  const already = current.interestedCareerRoles.includes(roleType);
  const full = current.interestedCareerRoles.length >= MAX_INTERESTED_ROLES;
  return {
    interestedCareerRoles: already || full ? [...current.interestedCareerRoles] : [...current.interestedCareerRoles, roleType],
    // Marking a career Interested brings it back if it was dismissed earlier.
    dismissedCareerRoles: current.dismissedCareerRoles.filter((role) => role !== roleType),
  };
}

/** Save a tap on Interested for the signed-in student only. */
export async function setCareerInterest(user: User, roleType: string, interested: boolean): Promise<string[]> {
  if (!user.id) throw new ApiError(401, "unauthorized", "Sign in required.");
  const next = nextInterestLists(user, roleType, interested);
  await db
    .update(users)
    .set({ ...next, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  return next.interestedCareerRoles;
}
