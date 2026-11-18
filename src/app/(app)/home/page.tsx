import { count, desc, eq } from "drizzle-orm";
import { INSTRUMENT } from "@/content/mini-ipip";
import { db } from "@/db";
import { assessments, rotations } from "@/db/schema";
import { careerRoleLabel } from "@/features/direction/career-roles";
import { loadDirection } from "@/features/direction/server";
import { HomeHub, homeTraits, majorLine } from "@/features/home/hub";
import { requireUser } from "@/lib/auth";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const user = await requireUser();
  const [countRows, assessmentRows] = await Promise.all([
    db.select({ value: count() }).from(rotations).where(eq(rotations.userId, user.id)),
    db
      .select({ instrument: assessments.instrument })
      .from(assessments)
      .where(eq(assessments.userId, user.id))
      .orderBy(desc(assessments.takenAt))
      .limit(1),
  ]);
  const rotationCount = Number(countRows[0]?.value ?? 0);
  const quizDone = assessmentRows[0]?.instrument === INSTRUMENT;
  const canReview = user.onboardedAt != null;
  const direction = quizDone ? await loadDirection(user) : null;

  return (
    <HomeHub
      quizDone={quizDone && direction != null}
      canReview={canReview}
      rotationCount={rotationCount}
      majorLine={majorLine(user)}
      traits={direction ? homeTraits(direction.traits, direction.readings) : []}
      suggestions={direction?.suggestions ?? []}
      interested={(direction?.interestedRoles ?? []).map((roleType) => ({ roleType, label: careerRoleLabel(roleType) }))}
    />
  );
}
