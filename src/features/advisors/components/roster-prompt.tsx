import { Button, Card } from "@/components/ui";
import { ROSTER_PROMPT } from "@/features/advisors/consent";
import { ROUTES } from "@/lib/constants";

/** Home card when an advisor listed the student and they haven't decided yet (item 15). Nothing is shared until they agree. */
export function RosterPrompt() {
  return (
    <Card>
      <p className="font-medium text-ink">{ROSTER_PROMPT}</p>
      <p className="mt-1 text-sm text-neutral-700">Nothing is shared unless you say yes. You can see exactly what advisors would see first.</p>
      <Button href={`${ROUTES.settings}#advisors`} variant="secondary" className="mt-3 w-full sm:w-auto">
        See what advisors would see
      </Button>
    </Card>
  );
}
