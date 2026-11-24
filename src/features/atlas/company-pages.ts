import { and, eq, inArray } from "drizzle-orm";
import { COMPANIES } from "@/content/companies";
import { db } from "@/db";
import { employers } from "@/db/schema";
import { normalizeEmployerName } from "@/features/review/normalize";
import { ROUTES } from "@/lib/constants";

/**
 * Directory company id → Swervly's own company page (/companies/[employerId]), for directory
 * companies that match an approved employer by normalized name. Same match the Community
 * Companies tab uses (src/features/community/directory.ts). Approved employers are the seeded,
 * founder-approved list, so a link says nothing about whether any student reviewed the company;
 * the company page applies its own anonymity thresholds. Empty when the read fails.
 */
export async function companyPageHrefs(): Promise<Record<string, string>> {
  const byName = new Map<string, string[]>();
  for (const company of COMPANIES) {
    const name = normalizeEmployerName(company.name);
    byName.set(name, [...(byName.get(name) ?? []), company.id]);
  }
  try {
    const rows = await db
      .select({ id: employers.id, normalizedName: employers.normalizedName })
      .from(employers)
      .where(and(inArray(employers.normalizedName, [...byName.keys()]), eq(employers.status, "approved")));
    const hrefs: Record<string, string> = {};
    for (const row of rows) {
      for (const companyId of byName.get(row.normalizedName) ?? []) hrefs[companyId] = ROUTES.company.replace("[id]", row.id);
    }
    return hrefs;
  } catch {
    return {};
  }
}
