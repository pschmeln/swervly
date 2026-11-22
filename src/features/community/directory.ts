import { eq } from "drizzle-orm";
import { COMPANY_FAMILIES } from "@/content/atlas/company-links";
import { COMPANIES } from "@/content/companies";
import { db } from "@/db";
import { profiles, type User } from "@/db/schema";
import { atlasGraph } from "@/features/atlas/graph";
import type { AtlasNodeId, FamilyId } from "@/features/atlas/types";
import { directoryAverages } from "@/features/company/server";
import type { ChosenDirection } from "@/features/direction/chosen";
import { loadDirection } from "@/features/direction/server";
import { buildExploreModel } from "@/features/explore/view-model";
import { rankByHomeArea } from "@/features/location/area";
import { loadHomeArea } from "@/features/location/server";
import { publicAggregateMajor } from "@/features/majors/selection";
import { normalizeEmployerName } from "@/features/review/normalize";
import { ROUTES } from "@/lib/constants";
import type { DirectoryCompany } from "./directory-filter";

export { companiesForDirection, type DirectoryCompany } from "./directory-filter";


/** Career map families a chosen direction sits under (a specialization's own, or every specialization holding an occupation). */
export function directionFamilies(chosen: ChosenDirection | null): FamilyId[] {
  if (!chosen) return [];
  const graph = atlasGraph();
  const families = new Set<FamilyId>();
  const visit = (id: AtlasNodeId) => {
    for (const parent of graph.parents.get(id) ?? []) {
      if (parent.startsWith("fam:")) families.add(parent as FamilyId);
      else if (parent.startsWith("spec:")) visit(parent);
    }
  };
  visit(chosen.nodeId);
  return [...families];
}

/**
 * Companies & opportunities (item 13, moved from /direction/explore): the checked directory, with
 * Direction overlap, home-area ranking (item 3) and review averages for the viewer's major (item 4).
 */
export async function loadDirectoryCompanies(user: User): Promise<{ companies: DirectoryCompany[]; companyRoles: string[] }> {
  const [direction, profileRows, homeArea] = await Promise.all([
    loadDirection(user),
    db.select({ goal: profiles.goal }).from(profiles).where(eq(profiles.userId, user.id)).limit(1),
    loadHomeArea(user.id),
  ]);
  const goalValue = profileRows[0]?.goal;
  const goal = goalValue === "industry" || goalValue === "grad_school" || goalValue === "undecided" ? goalValue : null;
  const model = buildExploreModel({
    stored: { major: user.major, majorSource: user.majorSource, customMajorText: user.customMajorText },
    goal,
    direction: direction
      ? {
          label: direction.label,
          suggestions: direction.suggestions.map((item) => ({
            roleType: item.roleType,
            roleLabel: item.roleLabel,
            reason: item.reason,
            source: item.source,
            evidenceLabel: item.evidenceLabel,
          })),
        }
      : null,
    dismissedRoleIds: user.dismissedCareerRoles,
  });
  const ranked = rankByHomeArea(model.companies, homeArea);
  const names = new Map(COMPANIES.map((company) => [company.id, normalizeEmployerName(company.name)]));
  const averages = await directoryAverages(user, [...new Set(ranked.map((company) => names.get(company.id)).filter((name): name is string => Boolean(name)))]);
  const viewerHasMajor = publicAggregateMajor(user) !== null;
  const companies = ranked.map((company): DirectoryCompany => {
    const found = averages.get(names.get(company.id) ?? "");
    const families = COMPANY_FAMILIES[company.id] ?? [];
    // Cards show ratings only; notes and pay stay on the company page.
    return found
      ? {
          ...company,
          families,
          averages: { mine: { ...found.mine, sharedNotes: [], payRange: null }, allMajors: found.allMajors },
          reviewsHref: ROUTES.company.replace("[id]", found.employerId),
          viewerHasMajor,
        }
      : { ...company, families };
  });
  return { companies, companyRoles: [...model.companyRoles] };
}
