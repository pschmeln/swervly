import type { FamilyId } from "@/features/atlas/types";
import type { CompanyCardModel } from "@/features/explore/types";

/** A directory card plus the career map families it is listed under. Client-safe. */
export type DirectoryCompany = CompanyCardModel & { families: readonly FamilyId[] };

/** Pure: the companies listed under any of the direction's families. All of them when there are none. */
export function companiesForDirection<T extends { families: readonly FamilyId[] }>(companies: readonly T[], families: readonly FamilyId[]): T[] {
  if (families.length === 0) return [...companies];
  const wanted = new Set(families);
  return companies.filter((company) => company.families.some((family) => wanted.has(family)));
}

