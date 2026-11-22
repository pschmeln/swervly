import { desc, eq } from "drizzle-orm";
import { Button, Card, PageShell } from "@/components/ui";
import { INSTRUMENT } from "@/content/mini-ipip";
import { db } from "@/db";
import { assessments, profiles } from "@/db/schema";
import { loadMajorSearchContext } from "@/features/majors/load";
import { selectionFromStored } from "@/features/majors/selection";
import { locationValueFrom } from "@/features/location/components/location-fields";
import { ProfileEditor } from "@/features/profile/components/profile-editor";
import { readTraits } from "@/features/profile/traits";
import type { TraitScores } from "@/features/profile/scoring";
import { TRAITS } from "@/content/mini-ipip";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Profile" };

function scoresFrom(value: unknown): TraitScores | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const scores = {} as TraitScores;
  for (const trait of TRAITS) {
    const score = record[trait];
    if (typeof score !== "number") return null;
    scores[trait] = score;
  }
  return scores;
}

export default async function ProfilePage() {
  const user = await requireUser();
  if (!user.onboardedAt) {
    return (
      <PageShell title="Profile">
        <Card>
          <p className="text-neutral-700">Finish the quiz and your basics first. Then you can edit them here.</p>
          <div className="mt-4">
            <Button href={ROUTES.onboarding} className="w-full sm:w-auto">Finish your profile</Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  const [profileRows, assessmentRows, majorSearch] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1),
    db
      .select({ instrument: assessments.instrument, scored: assessments.scored })
      .from(assessments)
      .where(eq(assessments.userId, user.id))
      .orderBy(desc(assessments.takenAt))
      .limit(1),
    loadMajorSearchContext(),
  ]);
  const profile = profileRows[0];
  const latest = assessmentRows[0];
  const parsedScores = latest?.instrument === INSTRUMENT ? scoresFrom(latest.scored) : null;
  const readings = parsedScores ? readTraits(parsedScores) : null;

  return (
    <PageShell title="Profile">
      {user.school ? (
        <p className="text-sm text-neutral-600">School domain from your sign-in: {user.school}</p>
      ) : null}
      {profile ? (
        <ProfileEditor
          majorSearch={majorSearch}
          initial={{
            school: profile.school ?? "",
            major: selectionFromStored(user),
            exploringMajors: user.exploringMajors,
            year: user.year == null ? "" : String(user.year),
            coopTrack: user.coopTrack ?? "",
            goal: profile.goal,
            goalNotes: profile.goalNotes ?? "",
            location: locationValueFrom(profile),
            constraintsNotes: profile.constraintsNotes ?? "",
          }}
        />
      ) : null}
      <Card>
        <h2 className="text-lg font-semibold">Quiz result</h2>
        {readings ? (
          <ul className="mt-4 grid gap-4">
            {readings.map((reading) => (
              <li key={reading.trait}>
                <p className="text-sm text-neutral-600">{reading.category}</p>
                <p className="text-base font-medium text-neutral-900">{reading.headline}</p>
                <p className="text-neutral-700">{reading.coopLine}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-neutral-700">Take the short personality quiz to see this in plain language.</p>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button href={`${ROUTES.onboarding}?retake=1`} variant="secondary" className="w-full sm:w-auto">
            Retake the quiz
          </Button>
          <Button href={ROUTES.direction} variant="secondary" className="w-full sm:w-auto">
            See your direction
          </Button>
        </div>
      </Card>
    </PageShell>
  );
}
