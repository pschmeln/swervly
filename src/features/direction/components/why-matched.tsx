import Link from "next/link";
import { focusRing } from "@/components/ui/controls";
import { ROUTES } from "@/lib/constants";

export const NO_PRIORITIES_HINT = "Pick what matters most to you in a co-op on your Profile to see more reasons here.";

/** "Why this matched" (item 20): 1–3 short reasons, each from a real input or real reviews. */
export function WhyMatched({ reasons, hasPriorities }: { reasons: readonly string[]; hasPriorities: boolean }) {
  return (
    <div className="mt-2">
      <h3 className="text-sm font-semibold text-ink">Why this matched</h3>
      <ul className="mt-1 grid list-disc gap-1 pl-5 text-neutral-700">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      {hasPriorities ? null : (
        <p className="mt-1 text-sm text-neutral-600">
          <Link href={ROUTES.profile} className={`inline-flex min-h-12 items-center underline ${focusRing}`}>
            {NO_PRIORITIES_HINT}
          </Link>
        </p>
      )}
    </div>
  );
}
