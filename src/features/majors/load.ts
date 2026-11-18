import { eq } from "drizzle-orm";
import { db } from "@/db";
import { majorAliases, majorCatalog } from "@/db/schema";
import type { MajorSearchContext } from "./catalog";

export async function loadMajorSearchContext(): Promise<MajorSearchContext> {
  const [majors, aliases] = await Promise.all([
    db.select().from(majorCatalog).where(eq(majorCatalog.status, "approved")),
    db
      .select({
        normalizedName: majorAliases.normalizedName,
        canonicalName: majorAliases.canonicalName,
      })
      .from(majorAliases),
  ]);

  return {
    extraMajors: majors.map((row) => ({
      name: row.name,
      category: row.category,
      aliases: row.aliases,
    })),
    aliases,
  };
}
