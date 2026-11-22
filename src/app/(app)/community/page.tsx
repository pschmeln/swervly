import { PageShell } from "@/components/ui";
import { atlasPrototypeEnabled } from "@/features/atlas/prototype";
import { CompaniesDirectory } from "@/features/community/components/companies-directory";
import { directionFamilies, loadDirectoryCompanies } from "@/features/community/directory";
import { loadChosenDirection } from "@/features/direction/chosen";
import { ChosenDirectionLine } from "@/features/direction/components/chosen-direction";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata = { title: "Community" };

/**
 * Community (item 12), signed-in students only. Holds Companies & opportunities (item 13),
 * filtered to the student's chosen direction by default with "Show all" one tap away (item 8).
 * Posts and questions arrive in PR 4.2.
 */
export default async function CommunityPage() {
  const user = await requireOnboardedUser();
  const [chosen, directory] = await Promise.all([loadChosenDirection(user.id), loadDirectoryCompanies(user)]);
  const atlasOn = atlasPrototypeEnabled();
  return (
    <PageShell title="Community" description="Companies that hire co-op students, with ratings from students who shared their reviews.">
      {atlasOn ? <ChosenDirectionLine chosen={chosen} /> : null}
      <CompaniesDirectory
        companies={directory.companies}
        companyRoles={directory.companyRoles}
        directionTitle={atlasOn ? (chosen?.title ?? null) : null}
        directionFamilies={atlasOn ? directionFamilies(chosen) : []}
      />
    </PageShell>
  );
}
