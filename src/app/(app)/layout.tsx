import { UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { AppNav } from "@/components/app-nav";
import { SentryUser } from "@/components/sentry-user";
import { requireUser } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="px-4 py-6 text-ink-2">Loading…</p>}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SentryUser userId={user.id} />
      <header>
        <AppNav account={<UserButton />} />
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
