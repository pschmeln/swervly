import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Card } from "@/components/ui";
import { focusRing } from "@/components/ui/focus-ring";
import { ProductDemo } from "@/features/landing/demo";
import { ROUTES } from "@/lib/constants";
import { AUDIENCE_COPY } from "@/lib/audience";

export default function Page() {
  return (
    <Suspense fallback={<LandingPitch />}>
      <Landing />
    </Suspense>
  );
}

export function LandingPitch() {
  return (
    <main className="flex w-full flex-1 flex-col">
      <div className="sky-band">
        <div className="mx-auto w-full max-w-5xl px-4 pb-40 pt-5">
          <div className="flex items-center justify-between">
            <span
              className="inline-flex items-center"
              role="img"
              aria-label="Swervly"
            >
              {/* on-dark wordmark: white icon + white type/dot for sky-band contrast */}
              <BrandLogo
                variant="dark"
                wordmark
                size={36}
                sizeClassName="h-7 sm:h-9"
                decorative
              />
            </span>
          </div>
          <div className="mx-auto mt-12 max-w-2xl text-center sm:mt-16">
            <h1 className="font-serif text-5xl font-normal leading-[0.95] tracking-[-0.01em] text-white sm:text-7xl">
              Know yourself.
              <br />
              <em>Find your direction.</em>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-white">
              {AUDIENCE_COPY.pitch}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href={ROUTES.signUp} variant="secondary" className="w-full sm:w-auto">
                Get started
              </Button>
              <Link
                href={ROUTES.signIn}
                className={`inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/70 px-5 text-base font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto ${focusRing}`}
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto -mt-28 w-full max-w-4xl px-4">
        <ProductDemo />
      </div>

      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 pb-12 pt-14 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <Card key={step.title}>
            <p className="text-sm font-semibold text-accent">Step {index + 1}</p>
            <h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
            <p className="mt-2 leading-7 text-ink-2">{step.body}</p>
          </Card>
        ))}
        <p className="text-ink-2 md:col-span-3">{NO_COOP_NOTE}</p>
        <Card className="md:col-span-3">
          <h2 className="text-lg font-semibold">Who it&apos;s for</h2>
          <p className="mt-2 leading-7 text-ink-2">
            {AUDIENCE_COPY.whoFor}
          </p>
        </Card>
      </div>
    </main>
  );
}

// Same order as the demo above. No step needs a past co-op; reviewing one comes later (see NO_COOP_NOTE).
export const STEPS = [
  {
    title: "Understand how you work",
    body: "A short quiz of quick statements about how you like to work. There are no right answers.",
  },
  { title: "Explore and compare", body: AUDIENCE_COPY.exploreStep },
  {
    title: "Take a next step",
    body: "Pick a direction to try and get a short list of next steps you can edit.",
  },
] as const;

export const NO_COOP_NOTE =
  "No co-op yet? You can do all three steps today. After a co-op, you can reflect on it and your suggestions get sharper.";

async function Landing() {
  const { userId } = await auth();
  if (userId) redirect(ROUTES.home);
  return <LandingPitch />;
}
