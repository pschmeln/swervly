"use client";

import { useEffect } from "react";
import { setInternalUser } from "@/lib/sentry";

export function SentryUser({ userId }: { userId: string }) {
  useEffect(() => {
    setInternalUser(userId);
  }, [userId]);

  return null;
}
