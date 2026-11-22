import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { focusRing } from "@/components/ui/focus-ring";
import type { ChosenDirection } from "@/features/direction/chosen";
import { ROUTES } from "@/lib/constants";

const LEVEL_LABEL = { specialization: "Specialization", occupation: "Occupation" } as const;

export const NO_DIRECTION_LINE = "You haven't chosen a direction yet. Open the career map and tap “Make this my direction” on one that fits.";

/** Card used on Profile and Direction (item 8). */
export function ChosenDirectionCard({ chosen }: { chosen: ChosenDirection | null }) {
  return (
    <Card>
      <p className="text-sm font-semibold uppercase tracking-wide text-ink-3">Your chosen direction</p>
      {chosen ? (
        <>
          <h2 className="mt-1 font-serif text-2xl font-normal leading-tight text-ink">{chosen.title}</h2>
          <p className="mt-1 text-sm text-ink-3">{LEVEL_LABEL[chosen.level]} in the career map</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button href={chosen.href} variant="secondary" className="w-full sm:w-auto">
              Open in the career map
            </Button>
            <Button href={ROUTES.directionAtlas} variant="secondary" className="w-full sm:w-auto">
              Change direction
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-2 text-ink-2">{NO_DIRECTION_LINE}</p>
          <div className="mt-4">
            <Button href={ROUTES.directionAtlas} className="w-full sm:w-auto">
              Choose a direction
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

/** One line for Home's direction window. */
export function ChosenDirectionLine({ chosen }: { chosen: ChosenDirection | null }) {
  return (
    <div className="mt-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
      <p className="text-sm text-ink-3">Your chosen direction</p>
      {chosen ? (
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-semibold text-ink">{chosen.title}</span>
          <Link href={chosen.href} className={`inline-flex min-h-12 items-center text-sm font-medium text-[#1d4ed8] underline ${focusRing}`}>
            Change
          </Link>
        </p>
      ) : (
        <p className="mt-0.5">
          <Link href={ROUTES.directionAtlas} className={`inline-flex min-h-12 items-center font-medium text-[#1d4ed8] underline ${focusRing}`}>
            Choose one in the career map
          </Link>
        </p>
      )}
    </div>
  );
}
