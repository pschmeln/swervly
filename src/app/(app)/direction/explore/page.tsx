import { eq } from "drizzle-orm";
import { COMPANIES } from "@/content/companies";
import { directoryAverages } from "@/features/company/server";
import { publicAggregateMajor } from "@/features/majors/selection";
import { normalizeEmployerName } from "@/features/review/normalize";
import { Button, Card, PageShell } from "@/components/ui";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { loadDirection } from "@/features/direction/server";
import { rankByHomeArea } from "@/features/location/area";
import { loadHomeArea } from "@/features/location/server";
import { CareerExplore } from "@/features/explore/career-explore";
import { buildExploreModel } from "@/features/explore/view-model";
import { CAREER_EXPLORE_PROTOTYPE_ENABLED } from "@/features/explore/prototype";
import { requireOnboardedUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Career exploration" };

/**
 * Signed-in exploration. Direction and pathways come from loadDirection.
 * Discussions, sample experiences, and bookmarks stay on this screen only.
 */
export default async function CareerExplorePage() {
  const user = await requireOnboardedUser();
  if (!CAREER_EXPLORE_PROTOTYPE_ENABLED) {
    return (
      <PageShell title="Career exploration">
        <Card>
          <p className="text-neutral-800">This prototype is turned off.</p>
          <div className="mt-4">
            <Button href={ROUTES.direction} variant="secondary" className="w-full sm:w-auto">
              Back to Direction
            </Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  const [direction, profileRows, homeArea] = await Promise.all([
    loadDirection(user),
    db
      .select({ goal: profiles.goal })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1),
    loadHomeArea(user.id),
  ]);
  const goalValue = profileRows[0]?.goal;
  const goal = goalValue === "industry" || goalValue === "grad_school" || goalValue === "undecided" ? goalValue : null;
  const model = buildExploreModel({
    stored: {
      major: user.major,
      majorSource: user.majorSource,
      customMajorText: user.customMajorText,
    },
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
  // Companies headquartered in the student's area first; nothing is removed.
  model.companies = rankByHomeArea(model.companies, homeArea);
  // Review averages for the viewer's major, or all majors when theirs is too small (item 4).
  // Cards show ratings only; notes and pay stay on the company page.
  const names = new Map(COMPANIES.map((company) => [company.id, normalizeEmployerName(company.name)]));
  const averages = await directoryAverages(user, [...new Set(model.companies.map((company) => names.get(company.id)).filter((name): name is string => Boolean(name)))]);
  const viewerHasMajor = publicAggregateMajor(user) !== null;
  model.companies = model.companies.map((company) => {
    const found = averages.get(names.get(company.id) ?? "");
    return found
      ? { ...company, averages: { mine: { ...found.mine, sharedNotes: [], payRange: null }, allMajors: found.allMajors }, reviewsHref: ROUTES.company.replace("[id]", found.employerId), viewerHasMajor }
      : company;
  });

  return (
    <PageShell title="Career exploration">
      <CareerExplore model={model} phase="ready" />
    </PageShell>
  );
}
