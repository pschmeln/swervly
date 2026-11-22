import { Card, PageShell } from "@/components/ui";
import { CompaniesDirectory } from "@/features/community/components/companies-directory";
import { NO_POSTS, PostCard } from "@/features/community/components/post-card";
import { PostComposer } from "@/features/community/components/post-composer";
import { PostFilters, type PostFilterState } from "@/features/community/components/post-filters";
import { CommunityTabs } from "@/features/community/components/tabs";
import { directionFamilies, loadDirectoryCompanies } from "@/features/community/directory";
import { COMMUNITY_ROLE_IDS, hasCommunityTerms } from "@/features/community/rules";
import { directoryEmployers, listPosts } from "@/features/community/server";
import { loadChosenDirection } from "@/features/direction/chosen";
import { ChosenDirectionLine } from "@/features/direction/components/chosen-direction";
import { requireOnboardedUser } from "@/lib/auth";

export const metadata = { title: "Community" };

type Params = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

/**
 * Community (item 12): students' posts and advice (item 14, the main feature) and Companies &
 * opportunities (item 13). Both start filtered to the chosen direction, with Show all (item 8).
 */
export default async function CommunityPage({ searchParams }: { searchParams: Params }) {
  const [user, params] = await Promise.all([requireOnboardedUser(), searchParams]);
  const tab = one(params.tab) === "companies" ? "companies" : "posts";
  const chosen = await loadChosenDirection(user.id);
  const families = directionFamilies(chosen);
  const directionTitle = families.length > 0 ? (chosen?.title ?? null) : null;

  if (tab === "companies") {
    const directory = await loadDirectoryCompanies(user);
    return (
      <PageShell title="Community" description="Questions and advice from co-op students, and the companies that hire them.">
        <CommunityTabs active="companies" />
        <ChosenDirectionLine chosen={chosen} />
        <CompaniesDirectory companies={directory.companies} companyRoles={directory.companyRoles} directionTitle={directionTitle} directionFamilies={families} />
      </PageShell>
    );
  }

  const employers = await directoryEmployers();
  const company = employers.some((employer) => employer.id === one(params.company)) ? one(params.company) : "";
  const role = COMMUNITY_ROLE_IDS.includes(one(params.role)) ? one(params.role) : "";
  const state: PostFilterState = { company, role, all: one(params.all) === "1" };
  const posts = await listPosts(
    user,
    { employerId: company || null, roleType: role || null, families: state.all || !directionTitle ? [] : families },
    employers,
  );
  const now = new Date();

  return (
    <PageShell title="Community" description="Questions and advice from co-op students, and the companies that hire them.">
      <CommunityTabs active="posts" />
      <ChosenDirectionLine chosen={chosen} />
      <PostComposer employers={employers} agreed={hasCommunityTerms(user)} defaultArea={families[0] ?? null} />
      <PostFilters state={state} employers={employers} directionTitle={directionTitle} />
      {posts.length === 0 ? (
        <Card>
          <p className="text-neutral-800">{NO_POSTS}</p>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={post} now={now} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
