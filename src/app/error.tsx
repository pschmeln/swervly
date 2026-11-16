"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  return <ErrorFallback error={error} retry={retry} />;
}
