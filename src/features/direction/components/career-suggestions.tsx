"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Card } from "@/components/ui";
import { familiesForRole } from "@/features/atlas/compat";
import { DismissSuggestion } from "@/features/direction/components/dismiss-suggestion";
import {
  claimFlight,
  DISMISS_FAILED_MESSAGE,
  DISMISS_GATE_IDLE,
  DISMISS_REFRESH_UNLOCK_MS,
  DISMISS_UNKNOWN_MESSAGE,
  failDismiss,
  outcomeAfterPost,
  postDismissRole,
  reconcileDismissedRole,
  succeedDismissAwaitingRefresh,
  type DismissGate,
} from "@/features/direction/components/dismiss-gate";
import { InterestedButton } from "@/features/direction/components/interested-button";
import { WhyMatched } from "@/features/direction/components/why-matched";
import {
  DIRECTION_EXHAUSTED_ACTION,
  FALLBACK_EVIDENCE_LABEL,
  type DirectionSuggestion,
} from "@/features/direction/rules";
import { ROUTES } from "@/lib/constants";

export type CareerSuggestionView = DirectionSuggestion & {
  reasons?: string[];
};

type CareerSuggestionsProps = {
  initialLabel: string;
  initialSuggestions: CareerSuggestionView[];
  initialExhausted: boolean;
  interestedRoles: readonly string[];
  hasPriorities: boolean;
  atlasOn: boolean;
  /** Academic + How you work blocks, rendered under the direction label. */
  children?: ReactNode;
};

type DismissError = { roleType: string; kind: "failed" | "unknown" };

/**
 * Direction label + career cards. Dismisses are serialized: one Not for me at a time,
 * list updates only from server props after refresh (remount via parent `key`) on confirmed ok.
 * Confirmed failures stay in-page (no refresh/nav). Timeouts reconcile via GET before claiming fail.
 */
export function CareerSuggestions({
  initialLabel,
  initialSuggestions,
  initialExhausted,
  interestedRoles,
  hasPriorities,
  atlasOn,
  children,
}: CareerSuggestionsProps) {
  const router = useRouter();
  const [gate, setGate] = useState<DismissGate>(DISMISS_GATE_IDLE);
  const [error, setError] = useState<DismissError | null>(null);
  /** Sync lock — claim here, not inside setState, so a retry always starts a fresh fetch. */
  const flightRef = useRef<string | null>(null);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Generation so a timed-out attempt cannot refresh/navigate after unlock. */
  const attemptIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (unlockTimer.current) clearTimeout(unlockTimer.current);
    };
  }, []);

  const busy = gate.activeRole !== null;
  const showExhausted = initialExhausted || initialSuggestions.length === 0;

  function dismiss(roleType: string) {
    const claimed = claimFlight(flightRef.current, roleType);
    if (!claimed) return;
    // Assign the ref immediately (before any await/setState) so a second tap cannot start.
    flightRef.current = claimed;
    attemptIdRef.current += 1;
    const attemptId = attemptIdRef.current;
    setGate({ activeRole: claimed });
    setError(null);
    void runDismiss(claimed, attemptId);
  }

  function unlockAfterFailure() {
    if (unlockTimer.current) {
      clearTimeout(unlockTimer.current);
      unlockTimer.current = null;
    }
    flightRef.current = null;
    setGate(failDismiss(DISMISS_GATE_IDLE));
  }

  function lockAwaitingRefresh(attemptId: number) {
    if (attemptId !== attemptIdRef.current) return;
    setGate((current) => succeedDismissAwaitingRefresh(current));
    router.refresh();
    if (unlockTimer.current) clearTimeout(unlockTimer.current);
    unlockTimer.current = setTimeout(() => {
      if (attemptId !== attemptIdRef.current) return;
      flightRef.current = null;
      setGate(DISMISS_GATE_IDLE);
    }, DISMISS_REFRESH_UNLOCK_MS);
  }

  async function runDismiss(roleType: string, attemptId: number) {
    const post = await postDismissRole(roleType, { url: ROUTES.directionDismiss });
    if (attemptId !== attemptIdRef.current) return;

    let reconcile = null as Awaited<ReturnType<typeof reconcileDismissedRole>> | null;
    if (post === "timeout") {
      // Ambiguous: server may already have persisted. Reconcile without full-page nav.
      reconcile = await reconcileDismissedRole(roleType, { url: ROUTES.me });
      if (attemptId !== attemptIdRef.current) return;
    }

    const outcome = outcomeAfterPost(post, reconcile);
    if (outcome.kind === "ok") {
      lockAwaitingRefresh(attemptId);
      return;
    }

    // Confirmed fail or unknown: keep page + cards; in-page error; unlock. Never refresh here
    // (offline refresh would kick Chrome's offline interstitial).
    unlockAfterFailure();
    setError({ roleType, kind: outcome.kind });
  }

  return (
    <>
      <p className="text-neutral-700">{initialLabel}</p>
      {children}
      <h2 className="text-lg font-semibold">Career direction</h2>
      <div className="grid gap-4">
        {showExhausted ? (
          <Card>
            <p className="text-neutral-700">{DIRECTION_EXHAUSTED_ACTION}</p>
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
        {initialSuggestions.map((suggestion) => (
          <Card key={suggestion.roleType}>
            <h2 className="text-lg font-semibold">{suggestion.roleLabel}</h2>
            {suggestion.evidenceLabel ? (
              <p className="mt-1 text-sm text-neutral-600">{suggestion.evidenceLabel}</p>
            ) : null}
            {suggestion.reasons && suggestion.evidenceLabel !== FALLBACK_EVIDENCE_LABEL ? (
              <WhyMatched reasons={suggestion.reasons} hasPriorities={hasPriorities} />
            ) : (
              <p className="mt-1 text-neutral-700">{suggestion.reason}</p>
            )}
            {suggestion.roleType !== "insufficient" ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
                <InterestedButton
                  roleType={suggestion.roleType}
                  initial={interestedRoles.includes(suggestion.roleType)}
                />
                <div className="flex w-full flex-col gap-1 sm:w-auto">
                  <DismissSuggestion
                    roleType={suggestion.roleType}
                    disabled={busy}
                    pending={gate.activeRole === suggestion.roleType}
                    onDismiss={dismiss}
                  />
                  {error?.roleType === suggestion.roleType ? (
                    <p role="alert" className="text-sm font-medium text-red-700">
                      {error.kind === "unknown" ? DISMISS_UNKNOWN_MESSAGE : DISMISS_FAILED_MESSAGE}
                    </p>
                  ) : null}
                </div>
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
        <Button href={ROUTES.community} className="w-full sm:w-auto">
          See companies in Community
        </Button>
        <Button href={ROUTES.reviews} variant="secondary" className="w-full sm:w-auto">
          Review a co-op
        </Button>
        {atlasOn && initialSuggestions.length > 0 ? (
          <Button href={ROUTES.directionAtlas} variant="secondary" className="w-full sm:w-auto">
            Browse the career map
          </Button>
        ) : null}
      </div>
    </>
  );
}
