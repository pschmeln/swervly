import { SignOutButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { PageShell } from "@/components/ui";

export const NOT_ELIGIBLE_COPY =
  "Swervly is for students with a .edu email. Sign in with your school address. Other addresses are refused and do not create an account.";

export default function NotEligiblePage() {
  return (
    <PageShell>
      <h1 className="text-2xl font-semibold tracking-tight">Not eligible</h1>
      <p className="text-lg leading-7">
        {NOT_ELIGIBLE_COPY}
      </p>
      <Suspense>
        <SignOutButton>
          <button
            type="button"
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-5 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Sign out
          </button>
        </SignOutButton>
      </Suspense>
    </PageShell>
  );
}
