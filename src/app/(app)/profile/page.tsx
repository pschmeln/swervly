import { desc, eq } from "drizzle-orm";
import { Button, Card, PageShell } from "@/components/ui";
import { INSTRUMENT } from "@/content/mini-ipip";
import { db } from "@/db";
import { assessments, profiles } from "@/db/schema";
import { loadMajorSearchContext } from "@/features/majors/load";
import { selectionFromStored } from "@/features/majors/selection";
import { readPriorities } from "@/features/direction/priorities";
import { locationValueFrom } from "@/features/location/value";
import { ProfileEditor } from "@/features/profile/components/profile-editor";
import { loadChosenDirection } from "@/features/direction/chosen";
import { ChosenDirectionCard } from "@/features/direction/components/chosen-direction";
import { hasCommunityTerms } from "@/features/community/rules";
import { archetypeFor } from "@/features/profile/archetype";
import { ArchetypeCard } from "@/features/profile/components/archetype-card";
import { readTraits } from "@/features/profile/traits";
import { scoresFromStored } from "@/features/profile/scoring";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Profile" };

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

  const [profileRows, assessmentRows, majorSearch, chosen] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.userId, user.id)).limit(1),
    db
      .select({ instrument: assessments.instrument, scored: assessments.scored })
      .from(assessments)
      .where(eq(assessments.userId, user.id))
      .orderBy(desc(assessments.takenAt))
      .limit(1),
    loadMajorSearchContext(),
    loadChosenDirection(user.id),
  ]);
  const profile = profileRows[0];
  const latest = assessmentRows[0];
  const parsedScores = latest?.instrument === INSTRUMENT ? scoresFromStored(latest.scored) : null;
  const readings = parsedScores ? readTraits(parsedScores) : null;
  const archetype = parsedScores ? archetypeFor(parsedScores) : null;

  return (
    <PageShell title="Profile">
      {/* Order (V1-08): direction, how you work, your details; sharing comes last. Points live in Settings. */}
      <ChosenDirectionCard chosen={chosen} />
      <Card>
        <h2 className="text-lg font-semibold">How you work</h2>
        <p className="mt-1 text-sm text-neutral-600">From your quiz. If a line doesn&apos;t sound like you, retake it.</p>
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
            goal: profile.goal,
            goalNotes: profile.goalNotes ?? "",
            location: locationValueFrom(profile),
            priorities: readPriorities(profile.priorities),
            constraintsNotes: profile.constraintsNotes ?? "",
          }}
        />
      ) : null}
      {archetype ? <ArchetypeCard card={archetype} share={{ agreed: hasCommunityTerms(user) }} /> : null}
    </PageShell>
  );
}
