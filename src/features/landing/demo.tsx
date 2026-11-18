"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { focusRing } from "@/components/ui/controls";

/**
 * Animated product demo for the logged-out page (founder request, Nov 18,
 * 2026). Coded, not a video: it uses the app's own styles, so it stays in step
 * with the design. All data is made up.
 *
 * Timing: one "beat" every 900ms; each scene has 4 beats. The demo pauses on
 * request (WCAG 2.2.2) and does not play by itself when the visitor asked for
 * reduced motion; it then shows each scene's final state.
 */
export const DEMO_SCENES = [
  { key: "quiz", caption: "Take a one-minute quiz", detail: "Twenty quick statements. No right answers." },
  { key: "direction", caption: "See careers that might fit", detail: "Mark the ones you want to explore." },
  { key: "review", caption: "Review your co-ops", detail: "Every review makes Direction sharper." },
  { key: "loop", caption: "Swervly grows with you", detail: "Know yourself, choose a path, reflect, repeat." },
] as const;

export const BEATS_PER_SCENE = 4;
export const BEAT_MS = 900;

/** Which scene and beat to show. When not playing, a scene shows its finished state. */
export function demoFrame(tick: number, running: boolean): { scene: number; beat: number } {
  const safe = Math.max(0, Math.floor(tick));
  return {
    scene: Math.floor(safe / BEATS_PER_SCENE) % DEMO_SCENES.length,
    beat: running ? safe % BEATS_PER_SCENE : BEATS_PER_SCENE - 1,
  };
}

function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function ProductDemo() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const running = !paused && !reduced;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), BEAT_MS);
    return () => window.clearInterval(timer);
  }, [running]);

  const { scene, beat } = demoFrame(tick, running);
  const current = DEMO_SCENES[scene]!;

  return (
    <section aria-label="Demo of Swervly with made-up data" className="w-full">
      <div className="glass overflow-hidden rounded-[26px]">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3" aria-hidden="true">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
          <span className="ml-3 rounded-full bg-neutral-100 px-3 py-1 text-xs text-ink-3">app.swervly.com</span>
          <span className="ml-auto rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">Sample data</span>
        </div>
        <div aria-hidden="true" className="relative h-[300px] bg-gradient-to-b from-[#f4f7fd] to-white px-4 py-5 sm:h-[340px] sm:px-8">
          {scene === 0 ? <QuizScene beat={beat} /> : null}
          {scene === 1 ? <DirectionScene beat={beat} /> : null}
          {scene === 2 ? <ReviewScene beat={beat} /> : null}
          {scene === 3 ? <LoopScene beat={beat} /> : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-ink">
            {scene + 1}. {current.caption}
          </p>
          <p className="text-ink-2">{current.detail}</p>
        </div>
        <div className="flex items-center gap-2">
          {DEMO_SCENES.map((item, index) => (
            <button
              key={item.key}
              type="button"
              aria-label={`Show step ${index + 1}: ${item.caption}`}
              aria-current={index === scene ? "step" : undefined}
              onClick={() => setTick(index * BEATS_PER_SCENE)}
              className={`flex size-12 items-center justify-center rounded-full ${focusRing}`}
            >
              <span className={`block h-2.5 rounded-full transition-all ${index === scene ? "w-7 bg-ink" : "w-2.5 bg-neutral-300"}`} />
            </button>
          ))}
          {reduced ? null : (
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              className={`min-h-12 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold text-ink ${focusRing}`}
            >
              {paused ? "Play demo" : "Pause demo"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Fade({ show, children, className = "" }: { show: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`transition-all duration-500 ${show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"} ${className}`}>
      {children}
    </div>
  );
}

function Tap({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex min-h-10 items-center justify-center rounded-xl border px-3 text-sm font-semibold transition-colors duration-300 ${
        on ? "border-ink bg-ink text-white" : "border-neutral-200 bg-white text-ink"
      }`}
    >
      {children}
    </span>
  );
}

function QuizScene({ beat }: { beat: number }) {
  const choice = beat >= 2 ? 4 : null;
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center">
      <p className="text-xs font-semibold text-ink-3">Question 7 of 20</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
        <div className="h-full rounded-full bg-gradient-to-r from-[#2f6bff] to-[#7c5cff] transition-all duration-700" style={{ width: beat >= 3 ? "40%" : "35%" }} />
      </div>
      <p className="mt-5 text-lg font-semibold text-ink sm:text-xl">I like trying new ways of doing things.</p>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <Tap key={score} on={choice === score}>
            {score}
          </Tap>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-ink-3">
        <span>Very inaccurate</span>
        <span>Very accurate</span>
      </div>
      <Fade show={beat >= 3} className="mt-5">
        <span className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Next</span>
      </Fade>
    </div>
  );
}

const DEMO_CAREERS = [
  { name: "Hardware design", why: "Fits your curiosity and focus" },
  { name: "Controls and automation", why: "Students like you enjoyed it" },
  { name: "Test engineering", why: "Hands-on, structured work" },
];

function DirectionScene({ beat }: { beat: number }) {
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center gap-2.5">
      <p className="font-serif text-2xl text-ink">Your direction</p>
      {DEMO_CAREERS.map((career, index) => (
        <Fade key={career.name} show={beat >= index || beat >= 2}>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{career.name}</p>
              <p className="truncate text-sm text-ink-3">{career.why}</p>
            </div>
            <span
              className={`shrink-0 whitespace-nowrap rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors duration-300 ${
                index === 0 && beat >= 3 ? "border-ink bg-ink text-white" : "border-neutral-200 bg-white text-ink"
              }`}
            >
              {index === 0 && beat >= 3 ? "✓ Interested" : "Interested"}
            </span>
          </div>
        </Fade>
      ))}
    </div>
  );
}

function ReviewScene({ beat }: { beat: number }) {
  const employer = "Test Employer A";
  const typed = employer.slice(0, Math.min(employer.length, Math.round(((beat + 1) / 2) * employer.length)));
  return (
    <div className="mx-auto flex h-full max-w-lg flex-col justify-center gap-3">
      <p className="font-serif text-2xl text-ink">Log a co-op</p>
      <div className="rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-ink">
        {typed}
        {beat < 1 ? <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-ink align-middle" /> : null}
      </div>
      <p className="text-sm font-semibold text-ink">How much did you enjoy the work?</p>
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((score) => (
          <Tap key={score} on={beat >= 2 && score === 5}>
            {score}
          </Tap>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="inline-flex rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white">Save co-op</span>
        <Fade show={beat >= 3}>
          <span className="rounded-full bg-[#e7f7ef] px-3 py-1.5 text-sm font-semibold text-[#0f7a4a]">Saved. Direction updated.</span>
        </Fade>
      </div>
    </div>
  );
}

const LOOP = ["Self", "Direction", "Action", "Review"];

function LoopScene({ beat }: { beat: number }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      <p className="font-serif text-3xl text-ink">
        Know yourself. <em>Find your direction.</em>
      </p>
      <ol className="flex flex-wrap items-center justify-center gap-2">
        {LOOP.map((step, index) => (
          <li key={step} className="flex items-center gap-2">
            <span
              className={`rounded-2xl border px-3.5 py-2 text-sm font-semibold transition-colors duration-300 ${
                step === "Action"
                  ? "border-dashed border-neutral-300 bg-neutral-50 text-ink-3"
                  : index === beat
                    ? "border-accent bg-accent-soft text-[#1d4ed8]"
                    : "border-neutral-200 bg-white text-ink"
              }`}
            >
              {step}
              {step === "Action" ? " · soon" : ""}
            </span>
            {index < LOOP.length - 1 ? <span className="text-ink-3">→</span> : <span className="text-ink-3">↺</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}
