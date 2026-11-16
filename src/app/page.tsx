import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button, Card } from "@/components/ui";
import { ROUTES } from "@/lib/constants";

export default function Page() {
  return (
    <Suspense fallback={<LandingPitch />}>
      <Landing />
    </Suspense>
  );
}

export function LandingPitch() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">Swervly</h1>
        <p className="text-lg leading-7 text-neutral-700">
          Built for University of Cincinnati students, and open to any university
          email. A free place to keep a record of your co-ops and internships and
          see what your interests point toward.
        </p>
        <div>
          <Button href={ROUTES.signIn} className="w-full sm:w-auto">
            Sign in
          </Button>
        </div>
      </header>

      <Card>
        <h2 className="text-lg font-semibold">What Swervly is</h2>
        <p className="mt-2 leading-7 text-neutral-700">
          Swervly is a record of work you have already done and the direction you
          are considering. You answer a short interest questionnaire and log each
          co-op or internship yourself. Today you see only your own record. Other
          students&apos; reviews are not shown.
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">What you put in</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 leading-7 text-neutral-700">
          <li>Two consents, so you know how your answers are stored</li>
          <li>Your school, major, and year</li>
          <li>Your goals, and constraints such as where you can work</li>
          <li>30 interest questions</li>
          <li>
            The co-ops and internships you want to keep: employer, role, term, and
            a short review
          </li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">What you get back now</h2>
        <ul className="mt-2 list-disc space-y-2 pl-5 leading-7 text-neutral-700">
          <li>Your six RIASEC interest scores, as numbers</li>
          <li>A private record of the co-ops and internships you entered</li>
        </ul>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">What comes later</h2>
        <p className="mt-2 leading-7 text-neutral-700">
          As more students join, we plan to add employer insights, pay ranges, and
          help choosing a direction. Those are not in the product today. Pay is
          not shown, and nothing here compares you with other students yet.
        </p>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">It is free</h2>
        <p className="mt-2 leading-7 text-neutral-700">
          Swervly is free. Sign in with a university email that ends in .edu.
        </p>
        <div className="mt-4">
          <Button href={ROUTES.signIn} className="w-full sm:w-auto">
            Sign in
          </Button>
        </div>
      </Card>
    </main>
  );
}

async function Landing() {
  const { userId } = await auth();
  if (userId) redirect(ROUTES.home);
  return <LandingPitch />;
}
