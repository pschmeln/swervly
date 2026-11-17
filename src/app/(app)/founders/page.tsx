import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui";
import { db } from "@/db";
import { employers, majorSubmissions, skills } from "@/db/schema";
import { SKILL_CATALOG } from "@/content/skills";
import { listPublicMajorNames } from "@/features/majors/catalog";
import { loadMajorSearchContext } from "@/features/majors/load";
import { MajorQueue } from "@/features/majors/components/major-queue";
import { FounderQueue } from "@/features/moderation/founder-queue";
import { requireUser } from "@/lib/auth";
import { isFounderEmail } from "@/lib/founders";

export const metadata = { title: "Review queue" };

export default async function FoundersPage() {
  const user = await requireUser();
  if (!isFounderEmail(user.email)) notFound();

  const [pendingSkills, pendingEmployers, approvedEmployers, approvedCustom, pendingMajors, majorSearch] = await Promise.all([
    db.select().from(skills).where(eq(skills.status, "pending")),
    db.select().from(employers).where(eq(employers.status, "pending")),
    db.select({ id: employers.id, name: employers.name }).from(employers).where(eq(employers.status, "approved")),
    db.select({ name: skills.name }).from(skills).where(eq(skills.status, "approved")),
    db.select().from(majorSubmissions).where(eq(majorSubmissions.status, "pending")),
    loadMajorSearchContext(),
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
