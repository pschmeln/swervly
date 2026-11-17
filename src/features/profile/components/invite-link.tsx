"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function InviteLink({ href, count }: { href: string; count: number }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const label = count === 1 ? "1 classmate joined through your link." : `${count} classmates joined through your link.`;

  return (
    <div className="grid gap-3">
      <p className="break-all text-neutral-800">{href}</p>
      <p className="text-neutral-700">{label}</p>
      <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => void copy()}>
        {copied ? "Copied" : "Copy invite link"}
      </Button>
    </div>
  );
}
