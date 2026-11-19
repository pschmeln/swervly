import type { ActivityTag } from "@/features/atlas/types";

/**
 * Career Atlas preference questions (editorial).
 *
 * Each question offers two kinds of work, plus "Both" and "Not sure yet".
 * An answer only adds activity tags; it never removes a career, and "Not sure
 * yet" changes nothing. These are exploration prompts, not a validated
 * assessment, and no score from them is ever shown.
 *
 * Ids are stable. Never reuse an id for a different question.
 */
export type QuestionSide = { label: string; tags: readonly ActivityTag[] };

export type PreferenceQuestion = {
  id: string;
  prompt: string;
  a: QuestionSide;
  b: QuestionSide;
};

export const PREFERENCE_QUESTIONS: readonly PreferenceQuestion[] = [
  {
    id: "build-vs-model",
    prompt: "Which would you rather explore?",
    a: { label: "Designing and building a physical device", tags: ["build"] },
    b: { label: "Using math models to analyze how something performs", tags: ["model"] },
  },
  {
    id: "code-vs-data",
    prompt: "Which sounds more interesting?",
    a: { label: "Writing software that does something new", tags: ["code"] },
    b: { label: "Finding patterns and answers in data", tags: ["data"] },
  },
  {
    id: "people-vs-organize",
    prompt: "Which would you rather spend your day on?",
    a: { label: "Working directly with people, like patients, students or clients", tags: ["people"] },
    b: { label: "Planning and coordinating projects or processes", tags: ["organize"] },
  },
  {
    id: "test-vs-field",
    prompt: "Which would you rather do?",
    a: { label: "Testing and checking that things work as they should", tags: ["test"] },
    b: { label: "Working out on a site, in a plant or on a clinic floor", tags: ["field"] },
  },
  {
    id: "hardware-vs-software",
    prompt: "Which would you rather work on?",
    a: { label: "Hardware you can hold", tags: ["build"] },
    b: { label: "Software", tags: ["code"] },
  },
  {
    id: "people-vs-data",
    prompt: "Which fits you better right now?",
    a: { label: "Talking with people for much of the day", tags: ["people"] },
    b: { label: "Working mostly with numbers and data", tags: ["data"] },
  },
];

export type QuestionAnswer = "a" | "b" | "both" | "unsure";

export const ANSWER_LABELS: Readonly<Record<"both" | "unsure", string>> = {
  both: "Both",
  unsure: "Not sure yet",
};
