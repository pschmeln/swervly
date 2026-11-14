import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui";
import { ROUTES } from "@/lib/constants";

export default function Page() {
  return (
    <Suspense fallback={<LandingCopy />}>
      <Landing />
    </Suspense>
  );
}

function LandingCopy() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Swervly</h1>
      <p className="text-lg leading-7 text-neutral-700">
        University of Cincinnati students keep a record of their co-ops and what they learned.
      </p>
      <Button href={ROUTES.signIn}>Sign in</Button>
    </main>
  );
}

async function Landing() {
  const { userId } = await auth();
  if (userId) redirect(ROUTES.home);
  return <LandingCopy />;
}
