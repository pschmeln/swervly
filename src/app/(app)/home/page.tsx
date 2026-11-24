import { count, desc, eq } from "drizzle-orm";
import { INSTRUMENT } from "@/content/mini-ipip";
import { db } from "@/db";
import { assessments, rotations } from "@/db/schema";
import { shouldPromptRoster } from "@/features/advisors/access";
import { RosterPrompt } from "@/features/advisors/components/roster-prompt";
import { careerRoleLabel } from "@/features/direction/career-roles";
import { loadChosenDirection } from "@/features/direction/chosen";
import { loadDirection } from "@/features/direction/server";
import { getActivePlan } from "@/features/action/server";
import { HomeHub, homeTraits, majorLine } from "@/features/home/hub";
import { nextStep, type PlanSummary } from "@/features/home/next-step";
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
  const [direction, chosen, rosterPrompt, plan] = await Promise.all([
    quizDone ? loadDirection(user) : Promise.resolve(null),
    loadChosenDirection(user.id),
    canReview ? shouldPromptRoster(user) : Promise.resolve(false),
    loadPlanSummary(user.id),
  ]);
  const next = nextStep({
    onboarded: canReview,
    quizDone: quizDone && direction != null,
    chosenTitle: chosen?.title ?? null,
    plan,
  });

  return (
    <HomeHub
      next={next}
      quizDone={quizDone && direction != null}
      canReview={canReview}
      rotationCount={rotationCount}
      majorLine={majorLine(user)}
      traits={direction ? homeTraits(direction.traits, direction.readings) : []}
      suggestions={direction?.suggestions ?? []}
      interested={(direction?.interestedRoles ?? []).map((roleType) => ({ roleType, label: careerRoleLabel(roleType) }))}
      chosen={chosen}
      notice={rosterPrompt ? <RosterPrompt /> : undefined}
    />
  );
}

/** The active plan's goal and first open step, or null. Read-only; null when Action is unavailable. */
async function loadPlanSummary(userId: string): Promise<PlanSummary | null> {
  try {
    const bundle = await getActivePlan(userId);
    if (!bundle) return null;
    const open = bundle.tasks.find((task) => task.status !== "done");
    return { goalTitle: bundle.plan.goalTitle, nextTask: open?.title ?? null };
  } catch {
    return null;
  }
}
