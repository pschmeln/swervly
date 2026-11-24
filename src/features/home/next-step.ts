import { ACTION_HREF } from "@/features/action-ui/paths";
import { ROUTES } from "@/lib/constants";

/**
 * The one primary call to action on Home (V1-08, Nov 24, 2026). New and returning
 * students both get exactly one: the first unfinished step of Self → Direction → Action.
 * A co-op review is never the next step; it stays a secondary, contextual link.
 */
export type NextStep = {
  key: "onboarding" | "quiz" | "direction" | "plan" | "continue";
  title: string;
  body: string;
  cta: string;
  href: string;
};

/** What Home knows about the student's active plan (read from Action, never changed here). */
export type PlanSummary = { goalTitle: string; nextTask: string | null };

export type NextStepInput = {
  onboarded: boolean;
  quizDone: boolean;
  /** Title of the career map node the student chose, or null. */
  chosenTitle: string | null;
  plan: PlanSummary | null;
};

export function nextStep({ onboarded, quizDone, chosenTitle, plan }: NextStepInput): NextStep {
  if (!onboarded) {
    return {
      key: "onboarding",
      title: "Finish your profile",
      body: "Your major, your year and a short quiz about how you work. A few minutes, no right answers.",
      cta: "Finish your profile",
      href: ROUTES.onboarding,
    };
  }
  if (!quizDone) {
    return {
      key: "quiz",
      title: "Take the quiz",
      body: "Quick statements about how you like to work. Swervly uses your answers to suggest directions.",
      cta: "Take the quiz",
      href: `${ROUTES.onboarding}?retake=1`,
    };
  }
  if (plan) {
    return {
      key: "continue",
      title: `Keep going on ${plan.goalTitle}`,
      body: plan.nextTask ? `Next up: ${plan.nextTask}` : "Every step is done. Add your next few steps.",
      cta: "Open my plan",
      href: ACTION_HREF,
    };
  }
  if (chosenTitle) {
    return {
      key: "plan",
      title: `Make a plan for ${chosenTitle}`,
      body: "Turn your direction into a few small steps you can edit.",
      cta: "Make my plan",
      href: ACTION_HREF,
    };
  }
  return {
    key: "direction",
    title: "Choose a direction to explore",
    body: "See why each suggestion might suit you, compare careers, and pick one to try.",
    cta: "Explore directions",
    href: ROUTES.direction,
  };
}
