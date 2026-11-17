import { count, desc, eq } from "drizzle-orm";
import { Button, Card, PageShell } from "@/components/ui";
import { INSTRUMENT } from "@/content/mini-ipip";
import { db } from "@/db";
import { assessments, rotations } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export function HomeSteps({
  quizDone,
  canReview,
  rotationCount,
}: {
  quizDone: boolean;
  canReview: boolean;
  rotationCount: number;
}) {
  const countLabel =
    rotationCount === 1 ? "1 co-op or internship logged." : `${rotationCount} co-ops and internships logged.`;

  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-semibold">Your profile</h2>
        <p className="mt-1 text-neutral-700">Major, goals, and the quiz. Change them any time.</p>
        <div className="mt-4">
          <Button href={ROUTES.profile} className="w-full sm:w-auto">Review your profile</Button>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">1. Take the quiz</h2>
        <p className="mt-1 text-neutral-700">
          {quizDone ? "Done. A short picture of how you work." : "About a minute. There are no right answers."}
        </p>
        <div className="mt-4">
          <Button href={canReview ? `${ROUTES.onboarding}?retake=1` : ROUTES.onboarding} variant={quizDone ? "secondary" : "primary"} className="w-full sm:w-auto">
            {quizDone ? "Retake the quiz" : "Take the quiz"}
          </Button>
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">2. Review your co-ops</h2>
        <p className="mt-1 text-neutral-700">{countLabel}</p>
        <div className="mt-4">
          {canReview ? (
            <Button href={ROUTES.reviews} className="w-full sm:w-auto">Review your co-ops</Button>
          ) : (
            <Button disabled>Review your co-ops</Button>
          )}
        </div>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">3. Get your direction</h2>
        <p className="mt-1 text-neutral-700">Our early guess, gets sharper as more students review.</p>
        <div className="mt-4">
          {quizDone ? (
            <Button href={ROUTES.direction} className="w-full sm:w-auto">Get your direction</Button>
          ) : (
            <Button disabled>Get your direction</Button>
          )}
        </div>
      </Card>
    </div>
  );
}

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

  return (
    <PageShell title="Home">
      <HomeSteps quizDone={quizDone} canReview={canReview} rotationCount={rotationCount} />
    </PageShell>
  );
}
