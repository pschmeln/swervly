import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isCareerRoleId } from "@/features/direction/career-roles";
import { ApiError } from "@/lib/api";

export const DismissRoleInput = z.object({
  roleType: z.string().trim().min(1).max(64),
}).refine((input) => isCareerRoleId(input.roleType), {
  path: ["roleType"],
  error: "Choose a suggestion to dismiss.",
});

export type DismissRoleInput = z.infer<typeof DismissRoleInput>;

export async function dismissCareerRole(userId: string, current: readonly string[], roleType: string): Promise<void> {
  if (!userId) throw new ApiError(401, "unauthorized", "Sign in required.");
  const next = [...new Set([...current, roleType])].slice(0, 30);
  await db
    .update(users)
    .set({ dismissedCareerRoles: next, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
