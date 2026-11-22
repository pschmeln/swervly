import { PageShell } from "@/components/ui";
import { CompanyAveragesSection } from "@/features/company/averages-section";
import { companyViewForUser } from "@/features/company/server";
import { requireOnboardedUser } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { notFound } from "next/navigation";

export const metadata = { title: "Company" };

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireOnboardedUser();
  const { id } = await params;
  let result: Awaited<ReturnType<typeof companyViewForUser>>;
  try {
    result = await companyViewForUser(user, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <PageShell title="Company">
      <CompanyAveragesSection employerName={result.employerName} viewerMajor={result.viewerMajor} averages={{ mine: result.mine, allMajors: result.allMajors }} />
    </PageShell>
  );
}
