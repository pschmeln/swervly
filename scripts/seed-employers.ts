import { resolve } from "node:path";
import { config } from "dotenv";
import { eq } from "drizzle-orm";

config({ path: resolve(process.cwd(), ".env.local") });

import { EMPLOYERS_SEED } from "@/content/employers-seed";
import { db } from "@/db";
import { employers } from "@/db/schema";
import { normalizeEmployerName } from "@/features/review/normalize";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  let inserted = 0;
  let updated = 0;

  for (const entry of EMPLOYERS_SEED) {
    const normalizedName = normalizeEmployerName(entry.name);
    const [existing] = await db
      .select({ id: employers.id })
      .from(employers)
      .where(eq(employers.normalizedName, normalizedName))
      .limit(1);

    if (existing) {
      await db
        .update(employers)
        .set({
          name: entry.name,
          aliases: entry.aliases,
          industry: entry.industry,
          city: entry.city,
          status: "approved",
        })
        .where(eq(employers.id, existing.id));
      updated += 1;
    } else {
      await db.insert(employers).values({
        name: entry.name,
        normalizedName,
        aliases: entry.aliases,
        industry: entry.industry,
        city: entry.city,
        status: "approved",
      });
      inserted += 1;
    }
  }

  console.log(`Employers seed complete: inserted ${inserted}, updated ${updated}.`);
}

main().catch(() => {
  console.error("Employers seed failed.");
  process.exit(1);
});
