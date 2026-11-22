"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Button, Card } from "@/components/ui";
import { familiesForRole } from "@/features/atlas/compat";
import { DismissSuggestion } from "@/features/direction/components/dismiss-suggestion";
import { InterestedButton } from "@/features/direction/components/interested-button";
import { WhyMatched } from "@/features/direction/components/why-matched";
import {
  DIRECTION_EXHAUSTED_ACTION,
  DIRECTION_EXHAUSTED_LABEL,
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

/** Pure: what the screen shows right after a successful Not for me (before refresh). */
export function afterDismiss(
  suggestions: readonly CareerSuggestionView[],
  roleType: string,
): { suggestions: CareerSuggestionView[]; exhausted: boolean; label: string | null } {
  const next = suggestions.filter((item) => item.roleType !== roleType);
  if (next.length === 0) {
    return { suggestions: next, exhausted: true, label: DIRECTION_EXHAUSTED_LABEL };
  }
  return { suggestions: next, exhausted: false, label: null };
}

/**
 * Direction label + career cards with optimistic dismiss: the last "Not for me"
 * clears the list and shows the exhausted heading/message immediately, then refreshes.
 * Parent should remount via `key` when server props change after refresh (replacements).
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
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [label, setLabel] = useState(initialLabel);
  const [exhausted, setExhausted] = useState(initialExhausted);

  function onDismissed(roleType: string) {
    const next = afterDismiss(suggestions, roleType);
    setSuggestions(next.suggestions);
    if (next.label) setLabel(next.label);
    if (next.exhausted) setExhausted(true);
    router.refresh();
  }

  const showExhausted = exhausted || suggestions.length === 0;

  return (
    <>
      <p className="text-neutral-700">{label}</p>
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
        {suggestions.map((suggestion) => (
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
                <InterestedButton roleType={suggestion.roleType} initial={interestedRoles.includes(suggestion.roleType)} />
                <DismissSuggestion roleType={suggestion.roleType} onDismissed={onDismissed} />
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
        {atlasOn && suggestions.length > 0 ? (
          <Button href={ROUTES.directionAtlas} variant="secondary" className="w-full sm:w-auto">
            Browse the career map
          </Button>
        ) : null}
      </div>
    </>
  );
}
