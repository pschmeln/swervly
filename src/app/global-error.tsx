"use client";

import "./globals.css";
import { ErrorFallback } from "@/components/error-fallback";

export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-full flex-col font-sans">
        <title>Something went wrong · Swervly</title>
        <ErrorFallback error={error} retry={retry} />
      </body>
    </html>
  );
}
