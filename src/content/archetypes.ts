/**
 * Work-style archetypes shown after the quiz and on Profile (item 18, Nov 21, 2026).
 * FOUNDER REVIEW: names and one-line descriptions.
 *
 * How a student gets one (src/features/profile/archetype.ts, deterministic):
 * - Only extraversion, agreeableness, conscientiousness and openness can name an
 *   archetype. Neuroticism never does, so a shared card can't lead with stress.
 * - The archetype comes from the strongest of those four traits that is outside the
 *   middle band (low <= 10, high >= 15, the same bands as the trait readings), measured
 *   by distance from 12. Ties go to conscientiousness, openness, extraversion, then
 *   agreeableness. If all four are in the middle band, the student is an All-Rounder.
 * - Same answers, same card. A retake recomputes it.
 *
 * Copy rule (D4): confident about the student's own answers; never claims what other
 * people with this archetype do or how they fare.
 *
 * Change the text freely. Changing which scores map to which archetype is a new
 * ARCHETYPE_VERSION, because shared cards (Stage 4) will store the id and version.
 */
export const ARCHETYPE_VERSION = 1;

export const ARCHETYPE_IDS = [
  "planner",
  "improviser",
  "explorer",
  "craftsperson",
  "connector",
  "deep-focuser",
  "team-anchor",
  "straight-shooter",
  "all-rounder",
] as const;

export type ArchetypeId = (typeof ARCHETYPE_IDS)[number];

export const ARCHETYPES: Readonly<Record<ArchetypeId, { name: string; description: string }>> = {
  planner: {
    name: "The Planner",
    description: "You turn big goals into clear steps and see them through.",
  },
  improviser: {
    name: "The Improviser",
    description: "You adapt fast and do your best work when the plan changes.",
  },
  explorer: {
    name: "The Explorer",
    description: "You light up around new ideas and problems no one has solved yet.",
  },
  craftsperson: {
    name: "The Craftsperson",
    description: "You master proven methods and make them run better every time.",
  },
  connector: {
    name: "The Connector",
    description: "You get energy from people and move work forward through them.",
  },
  "deep-focuser": {
    name: "The Deep Focuser",
    description: "You do your sharpest work with time to think on your own.",
  },
  "team-anchor": {
    name: "The Team Anchor",
    description: "You keep a team pulling together and look out for the people on it.",
  },
  "straight-shooter": {
    name: "The Straight Shooter",
    description: "You say what you think, and your directness makes ideas better.",
  },
  "all-rounder": {
    name: "The All-Rounder",
    description: "You shift between working styles easily and fit many kinds of teams.",
  },
};
