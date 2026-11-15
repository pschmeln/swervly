import { desc, eq } from "drizzle-orm";
import { Button, Card, PageShell } from "@/components/ui";
import { db } from "@/db";
import { assessments, profiles } from "@/db/schema";
import {
  GOAL_OPTIONS,
  LOCATION_OPTIONS,
  optionLabel,
  RIASEC_SCORES,
  textOrDash,
} from "@/features/profile/components/options";
import { requireOnboardedUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Profile" };

function scoreText(value: unknown): string {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(number)) return "—";
  return number.toFixed(2);
}

export default async function ProfilePage() {
  const user = await requireOnboardedUser();
  const [profileRows, assessmentRows] = await Promise.all([
    db
      .select({
        goal: profiles.goal,
        goalNotes: profiles.goalNotes,
        locationConstraint: profiles.locationConstraint,
        constraintsNotes: profiles.constraintsNotes,
      })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1),
    db
      .select({ scored: assessments.scored })
      .from(assessments)
      .where(eq(assessments.userId, user.id))
      .orderBy(desc(assessments.takenAt))
      .limit(1),
  ]);

  const profile = profileRows[0];
  const scored = assessmentRows[0]?.scored ?? null;

  return (
    <PageShell title="Profile">
      <div className="grid gap-4">
        <Card>
          <h2 className="text-lg font-semibold">Basics</h2>
          <dl className="mt-4 grid gap-3">
            <div>
              <dt className="text-sm text-neutral-600">Major</dt>
              <dd className="text-base text-neutral-900">{textOrDash(user.major)}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Year</dt>
              <dd className="text-base text-neutral-900">
                {user.year == null ? "—" : String(user.year)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Co-op track</dt>
              <dd className="text-base text-neutral-900">{textOrDash(user.coopTrack)}</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Goals</h2>
          <dl className="mt-4 grid gap-3">
            <div>
              <dt className="text-sm text-neutral-600">Goal</dt>
              <dd className="text-base text-neutral-900">{optionLabel(GOAL_OPTIONS, profile?.goal)}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Goal notes</dt>
              <dd className="text-base break-words text-neutral-900">{textOrDash(profile?.goalNotes)}</dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Location constraint</dt>
              <dd className="text-base text-neutral-900">
                {optionLabel(LOCATION_OPTIONS, profile?.locationConstraint)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-neutral-600">Other constraints</dt>
              <dd className="text-base break-words text-neutral-900">
                {textOrDash(profile?.constraintsNotes)}
              </dd>
            </div>
          </dl>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Interests</h2>
          <dl className="mt-4 grid gap-3">
            {RIASEC_SCORES.map((scale) => (
              <div key={scale.key}>
                <dt className="text-sm text-neutral-600">{scale.label}</dt>
                <dd className="text-base text-neutral-900">{scoreText(scored?.[scale.key])}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4">
            <Button href={`${ROUTES.onboarding}?retake=1`} variant="secondary" className="w-full sm:w-auto">
              Retake the interest questions
            </Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
