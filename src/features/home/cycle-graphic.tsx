import Link from "next/link";
import { focusRing } from "@/components/ui/controls";
import { ROUTES } from "@/lib/constants";

type Step = {
  key: string;
  title: string;
  subtitle: string;
  href: string | null;
  /** Center of the tile, in percent of the box. */
  x: number;
  y: number;
};

// Self -> Direction -> Action -> Review -> Self. Action is not built yet (founder decision, Nov 18).
export const CYCLE_STEPS: readonly Step[] = [
  { key: "self", title: "Self", subtitle: "Know yourself", href: ROUTES.profile, x: 50, y: 13 },
  { key: "direction", title: "Direction", subtitle: "Choose a path", href: ROUTES.direction, x: 83, y: 50 },
  { key: "action", title: "Action", subtitle: "Coming soon", href: null, x: 50, y: 87 },
  { key: "review", title: "Review", subtitle: "Reflect and update", href: ROUTES.reviews, x: 17, y: 50 },
];

const tile =
  "flex w-full flex-col items-center justify-center rounded-2xl border px-2 py-2.5 text-center sm:py-3";

/**
 * How Swervly is meant to be used, as a loop. Real HTML tiles (readable and
 * tappable on a phone) placed over a decorative ring. The box keeps a 5:4
 * shape so the ring and the tiles line up at every width.
 */
export function CycleGraphic() {
  return (
    <div className="relative mx-auto aspect-[5/4] w-full max-w-[520px]">
      <svg
        aria-hidden="true"
        viewBox="0 0 125 100"
        className="absolute inset-0 h-full w-full overflow-visible"
        fill="none"
      >
        <defs>
          <marker id="cycle-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="#2f6bff" />
          </marker>
          <linearGradient id="cycle-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2f6bff" />
            <stop offset="1" stopColor="#7c5cff" />
          </linearGradient>
        </defs>
        {/* Self -> Direction */}
        <path d="M84 12 C 100 12, 104 22, 104 37" stroke="url(#cycle-ring)" strokeWidth="1.1" markerEnd="url(#cycle-arrow)" />
        {/* Direction -> Action (not built yet) */}
        <path d="M104 63 C 104 78, 99 88, 85 88" stroke="#c3cee3" strokeWidth="1.1" strokeDasharray="2.4 2.4" markerEnd="url(#cycle-arrow)" />
        {/* Action -> Review (not built yet) */}
        <path d="M40 88 C 26 88, 21 78, 21 63" stroke="#c3cee3" strokeWidth="1.1" strokeDasharray="2.4 2.4" markerEnd="url(#cycle-arrow)" />
        {/* Review -> Self */}
        <path d="M21 37 C 21 22, 25 12, 41 12" stroke="url(#cycle-ring)" strokeWidth="1.1" markerEnd="url(#cycle-arrow)" />
      </svg>

      <div aria-hidden="true" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <p className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">Swervly</p>
        <p className="text-xs text-ink-3 sm:text-sm">Grows with you</p>
      </div>

      <ol aria-label="How Swervly works: Self, Direction, Action, then Review, and around again">
        {CYCLE_STEPS.map((step) => (
          <li
            key={step.key}
            // Each row is only as wide as its tile, so rows never overlap or stick out.
            className="absolute w-[31%] max-w-[150px] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${step.x}%`, top: `${step.y}%` }}
          >
            {step.href ? (
              <Link
                href={step.href}
                className={`${tile} border-neutral-200 bg-white shadow-[0_4px_14px_rgba(15,23,42,0.06)] transition-colors hover:border-accent ${focusRing}`}
              >
                <span className="text-base font-bold text-ink sm:text-lg">{step.title}</span>
                <span className="text-xs leading-tight text-ink-2 sm:text-sm">{step.subtitle}</span>
              </Link>
            ) : (
              <div aria-disabled="true" className={`${tile} border-dashed border-neutral-300 bg-neutral-50 text-ink-3`}>
                <span className="text-base font-bold sm:text-lg">{step.title}</span>
                <span className="text-xs leading-tight sm:text-sm">{step.subtitle}</span>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
