import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { ROUTES } from "@/lib/constants";

const NAV = [
  { href: ROUTES.home, label: "Home" },
  { href: ROUTES.profile, label: "Profile" },
  { href: ROUTES.reviews, label: "Reviews" },
  { href: ROUTES.settings, label: "Settings" },
] as const;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-neutral-600">Loading…</p>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <nav className="flex flex-wrap items-center gap-1" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex min-h-12 items-center rounded-lg px-3 text-base font-medium text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <UserButton />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
