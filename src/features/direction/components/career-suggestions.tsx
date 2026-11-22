"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Card } from "@/components/ui";
import { familiesForRole } from "@/features/atlas/compat";
import { DismissSuggestion } from "@/features/direction/components/dismiss-suggestion";
import {
  beginDismiss,
  DISMISS_GATE_IDLE,
  failDismiss,
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

/**
 * Direction label + career cards. Dismisses are serialized: one Not for me at a time,
 * list updates only from server props after refresh (remount via parent `key`).
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
  const [error, setError] = useState(false);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (unlockTimer.current) clearTimeout(unlockTimer.current);
    };
  }, []);

  const busy = gate.activeRole !== null;
  const showExhausted = initialExhausted || initialSuggestions.length === 0;

  function dismiss(roleType: string) {
    // Functional update so two rapid clicks cannot both claim the idle gate.
    let allowed = false;
    setGate((current) => {
      const next = beginDismiss(current, roleType);
      if (!next) return current;
      allowed = true;
      return next;
    });
    if (!allowed) return;
    void runDismiss(roleType);
  }

  async function runDismiss(roleType: string) {
    setError(false);
    try {
      const response = await fetch(ROUTES.directionDismiss, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ roleType }),
      });
      if (!response.ok) throw new Error("dismiss failed");
      setGate((current) => succeedDismissAwaitingRefresh(current));
      router.refresh();
      // Stay locked until remount with server suggestions; unlock if refresh never remounts.
      if (unlockTimer.current) clearTimeout(unlockTimer.current);
      unlockTimer.current = setTimeout(() => setGate(DISMISS_GATE_IDLE), 8_000);
    } catch {
      setGate((current) => failDismiss(current));
      setError(true);
    }
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
                <DismissSuggestion
                  roleType={suggestion.roleType}
                  disabled={busy}
                  pending={gate.activeRole === suggestion.roleType}
                  onDismiss={dismiss}
                />
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
        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            Couldn&apos;t save that. Try again.
          </p>
        ) : null}
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
