import { SignOutButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { Button, PageShell } from "@/components/ui";
import { EMAIL_CONFLICT_MESSAGE } from "@/lib/constants";

export default function AccountConflictPage() {
  return (
    <PageShell title="Account already exists">
      <p className="text-lg leading-7">{EMAIL_CONFLICT_MESSAGE}</p>
      <p className="leading-7 break-words text-neutral-700">
        Sign out, then sign in with the account that first used this email. If you
        still can&apos;t get in, email{" "}
        <a
          className="underline underline-offset-2 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
          href="mailto:support@swervly.com"
        >
          support@swervly.com
        </a>
        .
      </p>
      <div>
        <Suspense>
          <SignOutButton>
            <Button type="button" className="w-full sm:w-auto">
              Sign out
            </Button>
          </SignOutButton>
        </Suspense>
      </div>
    </PageShell>
  );
}
