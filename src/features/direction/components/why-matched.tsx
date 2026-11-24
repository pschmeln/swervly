import Link from "next/link";
import { focusRing } from "@/components/ui/focus-ring";
import { REASON_KIND_LABEL, type ReasonPart } from "@/features/direction/explain";
import { ROUTES } from "@/lib/constants";

export const NO_PRIORITIES_HINT = "Pick what matters most to you in a co-op on your Profile to see more reasons here.";

/** Shown under every explanation so a student can fix a wrong input instead of living with it. */
export const CORRECTION_PROMPT = "Something here wrong about you?";

/**
 * "Why this matched" (item 20, V1-07): one line per reason, each with where it comes from
 * (your quiz, your major, your goal, student reviews, your priorities), then links to change
 * the inputs behind them.
 */
export function WhyMatched({ parts, hasPriorities }: { parts: readonly ReasonPart[]; hasPriorities: boolean }) {
  const usesInputs = parts.some((part) => part.kind !== "general");
  return (
    <div className="mt-2">
      <h3 className="text-sm font-semibold text-ink">Why this matched</h3>
      <ul className="mt-1 grid gap-1.5 text-neutral-700">
        {parts.map((part) => (
          <li key={`${part.kind}:${part.text}`}>
            <span className="mr-1.5 inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
              {REASON_KIND_LABEL[part.kind]}
            </span>
            {part.text}
          </li>
        ))}
      </ul>
      {usesInputs && !hasPriorities ? (
        <p className="mt-1 text-sm text-neutral-600">
          <Link href={ROUTES.profile} className={`inline-flex min-h-12 items-center underline ${focusRing}`}>
            {NO_PRIORITIES_HINT}
          </Link>
        </p>
      ) : null}
      {usesInputs ? (
        <p className="mt-1 text-sm text-neutral-600">
          {CORRECTION_PROMPT}{" "}
          <Link href={ROUTES.profile} className={`inline-flex min-h-12 items-center underline ${focusRing}`}>
            Update your major or goal
          </Link>{" "}
          or{" "}
          <Link href={`${ROUTES.onboarding}?retake=1`} className={`inline-flex min-h-12 items-center underline ${focusRing}`}>
            retake the quiz
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
