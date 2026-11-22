"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { POINTS_COMING_SOON, friendsFinishedLabel, pointsBalanceLabel } from "@/features/profile/referral-copy";

export function InviteLink({
  href,
  finishedCount,
  points,
}: {
  href: string;
  finishedCount: number;
  points: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-3">
      <p className="break-all text-neutral-800">{href}</p>
      <p className="text-neutral-800">{pointsBalanceLabel(points)}</p>
      <p className="text-neutral-700">{friendsFinishedLabel(finishedCount)}</p>
      <p className="text-neutral-700">{POINTS_COMING_SOON}</p>
      <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy invite link"}
      </Button>
    </div>
  );
}
