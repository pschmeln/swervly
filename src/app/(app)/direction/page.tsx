import Link from "next/link";
import { WhyMatched } from "@/features/direction/components/why-matched";
import { Button, Card, PageShell } from "@/components/ui";
import { familiesForRole } from "@/features/atlas/compat";
import { atlasPrototypeEnabled } from "@/features/atlas/prototype";
import { DismissSuggestion } from "@/features/direction/components/dismiss-suggestion";
import { InterestedButton } from "@/features/direction/components/interested-button";
import { loadChosenDirection } from "@/features/direction/chosen";
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
            <Button href={`${ROUTES.onboarding}?retake=1`} className="w-full sm:w-auto">Take the quiz</Button>
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
      <p className="text-neutral-700">{direction.label}</p>
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
        <p className="mt-1 text-sm text-neutral-600">
          What your quiz says about how you work.
        </p>
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
      <h2 className="text-lg font-semibold">Career direction</h2>
      <div className="grid gap-4">
        {direction.suggestions.length === 0 ? (
          <Card>
            <p className="text-neutral-700">
              Retake the quiz if your answers have changed, or browse the career map to find a direction on your own.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button href={`${ROUTES.onboarding}?retake=1`} className="w-full sm:w-auto">
                Retake the quiz
              </Button>
              {atlasOn ? (
                <Button href={ROUTES.directionAtlas} variant="secondary" className="w-full sm:w-auto">
                  Browse the career map
                </Button>
              ) : null}
            </div>
          </Card>
        ) : null}
        {direction.suggestions.map((suggestion) => (
          <Card key={suggestion.roleType}>
            <h2 className="text-lg font-semibold">{suggestion.roleLabel}</h2>
            {suggestion.evidenceLabel ? (
              <p className="mt-1 text-sm text-neutral-600">{suggestion.evidenceLabel}</p>
            ) : null}
            {suggestion.reasons ? (
              <WhyMatched reasons={suggestion.reasons} hasPriorities={direction.priorities.length > 0} />
            ) : (
              <p className="mt-1 text-neutral-700">{suggestion.reason}</p>
            )}
            {suggestion.roleType !== "insufficient" ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
                <InterestedButton
                  roleType={suggestion.roleType}
                  initial={direction.interestedRoles.includes(suggestion.roleType)}
                />
                <DismissSuggestion roleType={suggestion.roleType} />
              </div>
            ) : null}
            {atlasOn && familiesForRole(suggestion.roleType)[0] ? (
              <p className="mt-3 text-sm">
                <Link
                  className="font-medium underline"
                  href={`${ROUTES.directionAtlas}?at=${encodeURIComponent(familiesForRole(suggestion.roleType)[0])}`}
                >
                  See careers in this area
                </Link>
              </p>
            ) : null}
          </Card>
        ))}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button href={ROUTES.community} className="w-full sm:w-auto">See companies in Community</Button>
        <Button href={ROUTES.reviews} variant="secondary" className="w-full sm:w-auto">Review a co-op</Button>
        {atlasOn ? (
          <Button href={ROUTES.directionAtlas} variant="secondary" className="w-full sm:w-auto">Browse the career map</Button>
        ) : null}
      </div>
    </PageShell>
  );
}
