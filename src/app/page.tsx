import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { Button, Card } from "@/components/ui";
import { focusRing } from "@/components/ui/focus-ring";
import { ProductDemo } from "@/features/landing/demo";
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
              Most students pick co-ops with almost no information about what they&apos;ll actually enjoy. Swervly
              learns how you work, then points you toward co-ops that fit.
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
        <Card className="md:col-span-3">
          <h2 className="text-lg font-semibold">Who it&apos;s for</h2>
          <p className="mt-2 leading-7 text-ink-2">
            Any student with an email that ends in .edu. Swervly is free, and it is not affiliated with a university.
          </p>
        </Card>
      </div>
    </main>
  );
}

const STEPS = [
  { title: "Take the quiz", body: "A minute of quick statements about how you like to work. There are no right answers." },
  { title: "Review your co-ops", body: "Rate what you enjoyed and learned. Your reviews help other students and sharpen your own Direction." },
  { title: "Get your direction", body: "Careers and majors matched to how you work, sharper as more students review co-ops." },
] as const;

async function Landing() {
  const { userId } = await auth();
  if (userId) redirect(ROUTES.home);
  return <LandingPitch />;
}
