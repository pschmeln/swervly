import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui";
import { db } from "@/db";
import { employers, majorSubmissions, skills } from "@/db/schema";
import { SKILL_CATALOG } from "@/content/skills";
import { listPublicMajorNames } from "@/features/majors/catalog";
import { loadMajorSearchContext } from "@/features/majors/load";
import { MajorQueue } from "@/features/majors/components/major-queue";
import { FounderAdvisors } from "@/features/advisors/components/founder-advisors";
import { founderAdvisorOverview } from "@/features/advisors/server";
import { ModerationQueue } from "@/features/community/components/moderation-queue";
import { loadModerationQueue } from "@/features/community/moderation";
import { FounderQueue } from "@/features/moderation/founder-queue";
import { requireUser } from "@/lib/auth";
import { isFounderEmail } from "@/lib/founders";

export const metadata = { title: "Review queue" };

export default async function FoundersPage() {
  const user = await requireUser();
  if (!isFounderEmail(user.email)) notFound();

  const [pendingSkills, pendingEmployers, approvedEmployers, approvedCustom, pendingMajors, majorSearch, community, advisorOverview] = await Promise.all([
    db.select().from(skills).where(eq(skills.status, "pending")),
    db.select().from(employers).where(eq(employers.status, "pending")),
    db.select({ id: employers.id, name: employers.name }).from(employers).where(eq(employers.status, "approved")),
    db.select({ name: skills.name }).from(skills).where(eq(skills.status, "approved")),
    db.select().from(majorSubmissions).where(eq(majorSubmissions.status, "pending")),
    loadMajorSearchContext(),
    loadModerationQueue(),
    founderAdvisorOverview(),
  ]);

  const skillTargets = [
    ...SKILL_CATALOG.map((skill) => skill.name),
    ...approvedCustom.map((row) => row.name),
  ];

  return (
    <PageShell title="Review queue">
      <p className="text-neutral-700">
        New companies, skills, and custom majors stay private to the student who added them until you approve them.
        Check this once a day.
      </p>
      <ModerationQueue reported={community.reported} hidden={community.hidden} />
      <FounderAdvisors schools={advisorOverview.schools} advisors={advisorOverview.advisors} />
      <MajorQueue
        submissions={pendingMajors.map((row) => ({ id: row.id, rawName: row.rawName }))}
        targets={listPublicMajorNames(majorSearch)}
      />
      <FounderQueue
        skills={pendingSkills.map((row) => ({ id: row.id, name: row.name, kind: row.kind }))}
        employers={pendingEmployers.map((row) => ({ id: row.id, name: row.name, city: row.city }))}
        skillTargets={[...new Set(skillTargets)]}
        employerTargets={approvedEmployers}
      />
    </PageShell>
  );
}
