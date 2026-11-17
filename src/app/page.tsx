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

function StepGraphic() {
  const steps = ["Quiz", "Reviews", "Direction"];
  return (
    <svg
      viewBox="0 0 320 88"
      role="img"
      aria-label="Three steps: take the quiz, review your co-ops, get your direction"
      className="h-auto w-full max-w-sm"
    >
      {steps.map((label, index) => {
        const x = 16 + index * 104;
        return (
          <g key={label}>
            <rect x={x} y="8" width="88" height="72" rx="12" fill="#171717" />
            <text x={x + 44} y="36" textAnchor="middle" fill="#ffffff" fontSize="20" fontFamily="sans-serif">
              {index + 1}
            </text>
            <text x={x + 44} y="58" textAnchor="middle" fill="#ffffff" fontSize="12" fontFamily="sans-serif">
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LandingPitch() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:py-12">
      <header className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold tracking-tight">Swervly</h1>
        <p className="text-lg leading-7 text-neutral-800">
          Most students pick co-ops with almost no information about what they&apos;ll actually enjoy.
        </p>
        <p className="leading-7 text-neutral-700">
          Swervly learns how you work, then points you toward co-ops that fit. The quiz is the
          input. Reviews from students, and a first guess from your answers, are what you come back for.
        </p>
        <StepGraphic />
        <div>
          <Button href={ROUTES.signIn} className="w-full sm:w-auto">
            Sign in
          </Button>
        </div>
      </header>

      <Card>
        <h2 className="text-lg font-semibold">Three steps</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5 leading-7 text-neutral-700">
          <li>Take the quiz</li>
          <li>Review your co-ops</li>
          <li>Get your direction</li>
        </ol>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Who it&apos;s for</h2>
        <p className="mt-2 leading-7 text-neutral-700">
          Any student with an email that ends in .edu. Swervly is free, and it is not affiliated
          with a university.
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
