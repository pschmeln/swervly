"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export function FeedbackLink() {
  const pathname = usePathname() || "/";
  const href = `${ROUTES.feedback}?page=${encodeURIComponent(pathname)}`;
  return (
    <Link
      href={href}
      className="inline-flex min-h-12 items-center text-base font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
    >
      Feedback
    </Link>
  );
}
