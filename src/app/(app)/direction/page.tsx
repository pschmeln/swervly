import { Button, Card, PageShell } from "@/components/ui";
import { QUIZ_EXPLORATORY_DISCLAIMER } from "@/content/mini-ipip";
import { loadDirection } from "@/features/direction/server";
import { captureEvent } from "@/lib/analytics";
import { requireOnboardedUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

export const metadata = { title: "Direction" };

export default async function DirectionPage() {
  const user = await requireOnboardedUser();
  const direction = await loadDirection(user);
  if (!direction) {
    return (
      <PageShell title="Direction">
        <Card>
          <p className="text-neutral-700">Take the quiz first. Direction is a guess from those answers.</p>
          <p className="mt-2 text-sm text-neutral-600">{QUIZ_EXPLORATORY_DISCLAIMER}</p>
          <div className="mt-4">
            <Button href={`${ROUTES.onboarding}?retake=1`} className="w-full sm:w-auto">Take the quiz</Button>
          </div>
        </Card>
      </PageShell>
    );
  }

  await captureEvent("direction_viewed", user.id);

  return (
    <PageShell title="Direction">
      <p className="text-neutral-700">{direction.label}</p>
      <p className="text-sm text-neutral-600">{QUIZ_EXPLORATORY_DISCLAIMER}</p>
      <Card>
        <h2 className="text-lg font-semibold">How you work</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Exploratory readings from your quiz. Personality similarity is not proof of career fit.
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
      <div className="grid gap-4">
        {direction.suggestions.map((suggestion) => (
          <Card key={suggestion.roleType}>
            <h2 className="text-lg font-semibold">{suggestion.roleLabel}</h2>
            {suggestion.evidenceLabel ? (
              <p className="mt-1 text-sm text-neutral-600">{suggestion.evidenceLabel}</p>
            ) : null}
            <p className="mt-1 text-neutral-700">{suggestion.reason}</p>
          </Card>
        ))}
      </div>
      <div>
        <Button href={ROUTES.reviews} variant="secondary" className="w-full sm:w-auto">Review a co-op</Button>
      </div>
    </PageShell>
  );
}
