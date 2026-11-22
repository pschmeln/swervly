import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { PageShell } from "@/components/ui";
import { focusRing } from "@/components/ui/focus-ring";
import { viewStudent, type StudentDetail } from "@/features/advisors/access";
import { StudentDetailView } from "@/features/advisors/components/student-detail";
import { requireApprovedAdvisor } from "@/features/advisors/server";
import { ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Student" };

/**
 * One student's details for an approved advisor (item 15, PR 6.3). Role, grant and roster are all
 * checked on every load; anything missing is a plain 404. Each load is written to the student's log.
 */
export default async function AdvisorStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  if (!z.uuid().safeParse(id).success) notFound();
  let detail: StudentDetail;
  try {
    detail = await viewStudent(await requireApprovedAdvisor(user), id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  return (
    <PageShell title="Student">
      <p>
        <Link href={ROUTES.advisors} className={`inline-flex min-h-12 items-center font-medium underline ${focusRing}`}>
          Back to Advisors
        </Link>
      </p>
      <StudentDetailView detail={detail} />
    </PageShell>
  );
}
