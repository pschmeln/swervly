import type { Trait } from "@/content/mini-ipip";
import { Button, Card } from "@/components/ui";
import { InterestedButton } from "@/features/direction/components/interested-button";
import { CycleGraphic } from "@/features/home/cycle-graphic";
import type { User } from "@/db/schema";
import { UNDECIDED_LABEL } from "@/features/majors/catalog";
import { ROUTES } from "@/lib/constants";

export type HomeTrait = { trait: Trait; category: string; headline: string; strength: number };

export type HomeHubProps = {
  quizDone: boolean;
  canReview: boolean;
  rotationCount: number;
  /** "Electrical Engineering · Year 3", or null when not set. */
  majorLine: string | null;
  /** Up to three of the student's most distinct traits. Empty before the quiz. */
  traits: HomeTrait[];
  /** Top career suggestions, already ranked (Interested first). */
  suggestions: { roleType: string; roleLabel: string; reason: string }[];
  interested: { roleType: string; label: string }[];
};

/** "Electrical Engineering · Year 3" for the profile window. */
export function majorLine(user: Pick<User, "major" | "majorSource" | "customMajorText" | "year">): string | null {
  const major =
    user.majorSource === "undecided"
      ? UNDECIDED_LABEL
      : user.majorSource === "custom"
        ? (user.customMajorText ?? user.major)
        : user.major;
  const parts = [major?.trim() || null, user.year ? `Year ${user.year}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

const MIDDLE = 12;
const MIN = 4;
const MAX = 20;

/**
 * Pick the traits that say the most about this student: the ones furthest
 * from the middle. "Under stress" is left out of Home on purpose; it stays
 * on Direction with its full wording.
 */
export function homeTraits(
  scores: Record<Trait, number>,
  readings: { trait: Trait; category: string; headline: string }[],
  count = 3,
): HomeTrait[] {
  return readings
    .filter((reading) => reading.trait !== "neuroticism")
    .map((reading) => ({
      ...reading,
      distance: Math.abs(scores[reading.trait] - MIDDLE),
      strength: Math.min(1, Math.max(0, (scores[reading.trait] - MIN) / (MAX - MIN))),
    }))
    .sort((left, right) => right.distance - left.distance)
    .slice(0, count)
    .map(({ trait, category, headline, strength }) => ({ trait, category, headline, strength }));
}

export function HomeHub(props: HomeHubProps) {
  return (
    <main className="flex w-full flex-1 flex-col">
      <div className="sky-band">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-8 px-4 pb-28 pt-8 sm:pt-12 md:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold text-white">Welcome back</p>
            <h1 className="mt-2 font-serif text-[2.75rem] font-normal leading-none tracking-[-0.01em] text-white sm:text-6xl">
              Know yourself.
              <br />
              <em>Find your direction.</em>
            </h1>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-white">
              Swervly learns how you work, suggests where you might fit, and gets sharper every time you review a co-op.
            </p>
          </div>
          <div className="glass rounded-[22px] p-3 sm:p-5">
            <CycleGraphic />
          </div>
        </div>
      </div>

      <div className="relative mx-auto -mt-8 grid w-full max-w-5xl items-start gap-5 px-4 pb-10 md:grid-cols-2">
        <ProfileWindow {...props} />
        <DirectionWindow {...props} />
      </div>
    </main>
  );
}

function WindowHead({ title, href, linkLabel }: { title: string; href: string; linkLabel: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <a href={href} className="whitespace-nowrap text-sm font-semibold text-accent underline-offset-4 hover:underline">
        {linkLabel} →
      </a>
    </div>
  );
}

function ProfileWindow({ quizDone, canReview, majorLine, traits }: HomeHubProps) {
  return (
    <Card>
      <WindowHead title="Your profile" href={ROUTES.profile} linkLabel="Open profile" />
      <p className="mt-1 text-sm text-ink-3">{[majorLine, quizDone ? "From your quiz" : null].filter(Boolean).join(" · ") || "Your major, goals and quiz"}</p>
      {quizDone && traits.length > 0 ? (
        <>
          <ul className="mt-4 grid gap-2.5">
            {traits.map((item) => (
              <li key={item.trait} className="rounded-2xl border border-neutral-200 bg-white px-4 py-3">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{item.headline}</span>
                  <span className="shrink-0 text-ink-3">{item.category}</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2f6bff] to-[#7c5cff]"
                    style={{ width: `${Math.round(8 + item.strength * 92)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Exploratory readings from your quiz, not a test score.</p>
        </>
      ) : (
        <div className="mt-4">
          <p className="text-ink-2">Take the short quiz so Swervly can learn how you work. About a minute, no right answers.</p>
          <Button href={canReview ? `${ROUTES.onboarding}?retake=1` : ROUTES.onboarding} className="mt-4 w-full sm:w-auto">
            Take the quiz
          </Button>
        </div>
      )}
    </Card>
  );
}

function DirectionWindow({ quizDone, canReview, rotationCount, suggestions, interested }: HomeHubProps) {
  const top = suggestions.slice(0, 3);
  const interestedIds = new Set(interested.map((item) => item.roleType));
  const reviewLine =
    rotationCount === 0
      ? "No co-ops logged yet."
      : rotationCount === 1
        ? "1 co-op or internship logged."
        : `${rotationCount} co-ops and internships logged.`;

  return (
    <Card>
      <WindowHead title="Your direction" href={ROUTES.direction} linkLabel="See all" />
      {quizDone ? (
        <>
          <p className="mt-1 text-sm text-ink-3">Top suggestions. Mark the ones you want to explore.</p>
          {top.length > 0 ? (
            <ul className="mt-4 grid gap-2.5">
              {top.map((item) => (
                <li
                  key={item.roleType}
                  className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{item.roleLabel}</p>
                    <p className="line-clamp-2 text-sm text-ink-3">{item.reason}</p>
                  </div>
                  {item.roleType !== "insufficient" ? (
                    <InterestedButton roleType={item.roleType} initial={interestedIds.has(item.roleType)} />
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-ink-2">You dismissed the current suggestions. See all of Direction for more.</p>
          )}
          {interested.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink">Saved careers</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {interested.map((item) => (
                  <li key={item.roleType} className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold text-[#1d4ed8]">
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <p className="mt-4 text-ink-2">Your direction appears after the quiz. It starts as a best guess and gets sharper as students review co-ops.</p>
      )}
      <div className="mt-5 border-t border-neutral-100 pt-4">
        <p className="text-sm text-ink-2">{reviewLine}</p>
        {canReview ? (
          <Button href={rotationCount === 0 ? ROUTES.reviewsNew : ROUTES.reviews} className="mt-3 w-full sm:w-auto">
            {rotationCount === 0 ? "Log a co-op review" : "Review your co-ops"}
          </Button>
        ) : (
          <Button disabled className="mt-3 w-full sm:w-auto">
            Log a co-op review
          </Button>
        )}
      </div>
    </Card>
  );
}
