import { COMPANIES } from "@/content/companies";

/**
 * Employers the co-op form offers, upserted by scripts/seed-employers.ts as approved
 * rows. Derived from src/content/companies.ts so the co-op form and Companies &
 * opportunities always list the same organizations. Edit companies.ts, not this file.
 */
export const EMPLOYERS_SEED: { name: string; aliases: string[]; industry: string | null; city: string | null }[] =
  COMPANIES.map((company) => ({
    name: company.name,
    aliases: [...company.aliases],
    industry: company.industry,
    city: company.city,
  }));
