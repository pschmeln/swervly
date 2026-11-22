"use client";

import { Button } from "@/components/ui";

/** Presentational Not for me control; parent serializes dismisses for the whole list. */
export function DismissSuggestion({
  roleType,
  disabled = false,
  pending = false,
  onDismiss,
}: {
  roleType: string;
  disabled?: boolean;
  pending?: boolean;
  onDismiss: (roleType: string) => void;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full sm:w-auto"
      disabled={disabled || pending}
      onClick={() => onDismiss(roleType)}
    >
      {pending ? "Saving…" : "Not for me"}
    </Button>
  );
}
