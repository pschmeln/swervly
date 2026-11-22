import Link from "next/link";
import { Button, Card, PageShell } from "@/components/ui";
import { atlasPrototypeEnabled } from "@/features/atlas/prototype";
import { loadChosenDirection } from "@/features/direction/chosen";
import { CareerSuggestions } from "@/features/direction/components/career-suggestions";
import { ChosenDirectionCard } from "@/features/direction/components/chosen-direction";
import { loadDirection } from "@/features/direction/server";
import { archetypeFor } from "@/features/profile/archetype";
import { ArchetypeCard } from "@/features/profile/components/archetype-card";
import { captureEvent } from "@/lib/analytics";
import { requireOnboardedUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Direction" };

export default async function DirectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireOnboardedUser();
  const justFinishedQuiz = (await searchParams).quiz === "done";
  const [direction, chosen] = await Promise.all([loadDirection(user), loadChosenDirection(user.id)]);
  if (!direction) {
    return (
      <PageShell title="Direction">
        <Card>
          <p className="text-neutral-700">Take the quiz first. Direction matches roles to how you work.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button href={`${ROUTES.onboarding}?retake=1`} className="w-full sm:w-auto">
              Take the quiz
            </Button>
            <Button href={ROUTES.community} variant="secondary" className="w-full sm:w-auto">
              See companies in Community
            </Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  await captureEvent("direction_viewed", user.id);
  const atlasOn = atlasPrototypeEnabled();

  return (
    <PageShell title="Direction">
      {justFinishedQuiz ? <ArchetypeCard card={archetypeFor(direction.traits)} justFinished /> : null}
      {atlasOn ? <ChosenDirectionCard chosen={chosen} /> : null}
      <CareerSuggestions
        key={[...direction.suggestions.map((item) => item.roleType), direction.exhausted ? "x" : "o"].join("|")}
        initialLabel={direction.label}
        initialSuggestions={direction.suggestions}
        initialExhausted={direction.exhausted}
        interestedRoles={direction.interestedRoles}
        hasPriorities={direction.priorities.length > 0}
        atlasOn={atlasOn}
      >
        {direction.academic.visible ? (
          <Card>
            <h2 className="text-lg font-semibold">Suggested majors</h2>
            <p className="mt-1 text-sm text-neutral-600">{direction.academic.note}</p>
            {direction.academic.suggestions.length > 0 ? (
              <ul className="mt-4 grid gap-4">
                {direction.academic.suggestions.map((suggestion) => (
                  <li key={suggestion.name}>
                    <p className="text-sm text-neutral-600">{suggestion.category}</p>
                    <p className="font-medium text-neutral-900">{suggestion.name}</p>
                    <p className="text-neutral-700">{suggestion.reason}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </Card>
        ) : (
          <p className="text-sm text-neutral-600">
            {direction.academic.note}{" "}
            <Link className="font-medium underline" href={ROUTES.profile}>
              Edit your profile
            </Link>
          </p>
        )}
        <Card>
          <h2 className="text-lg font-semibold">How you work</h2>
          <p className="mt-1 text-sm text-neutral-600">What your quiz says about how you work.</p>
          <ul className="mt-4 grid gap-4">
            {direction.readings.map((reading) => (
              <li key={reading.trait}>
                <p className="text-sm text-neutral-600">{reading.category}</p>
                <p className="font-medium text-neutral-900">{reading.headline}</p>
                <p className="text-neutral-700">{reading.coopLine}</p>
              </li>
            ))}
          </ul>
        </Card>
      </CareerSuggestions>
    </PageShell>
  );
}
