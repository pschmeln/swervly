import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui";
import { db } from "@/db";
import { employers, skills } from "@/db/schema";
import { SKILL_CATALOG } from "@/content/skills";
import { FounderQueue } from "@/features/moderation/founder-queue";
import { requireUser } from "@/lib/auth";
import { isFounderEmail } from "@/lib/founders";

export const metadata = { title: "Review queue" };

export default async function FoundersPage() {
  const user = await requireUser();
  if (!isFounderEmail(user.email)) notFound();

  const [pendingSkills, pendingEmployers, approvedEmployers, approvedCustom] = await Promise.all([
    db.select().from(skills).where(eq(skills.status, "pending")),
    db.select().from(employers).where(eq(employers.status, "pending")),
    db.select({ id: employers.id, name: employers.name }).from(employers).where(eq(employers.status, "approved")),
    db.select({ name: skills.name }).from(skills).where(eq(skills.status, "approved")),
  ]);

  const skillTargets = [
    ...SKILL_CATALOG.map((skill) => skill.name),
    ...approvedCustom.map((row) => row.name),
  ];

  return (
    <PageShell title="Review queue">
      <p className="text-neutral-700">
        New companies and skills stay private to the student who added them until you approve them.
        Check this once a day.
      </p>
      <FounderQueue
        skills={pendingSkills.map((row) => ({ id: row.id, name: row.name, kind: row.kind }))}
        employers={pendingEmployers.map((row) => ({ id: row.id, name: row.name, city: row.city }))}
        skillTargets={[...new Set(skillTargets)]}
        employerTargets={approvedEmployers}
      />
    </PageShell>
  );
}
