import type { Trait } from "@/content/mini-ipip";
import type { TraitScores } from "@/features/profile/scoring";

export type TraitBand = "low" | "middle" | "high";

export type TraitReading = {
  trait: Trait;
  category: string;
  headline: string;
  coopLine: string;
};

const COPY: Record<Trait, Record<TraitBand, { headline: string; coopLine: string }>> = {
  extraversion: {
    low: {
      headline: "You recharge alone",
      coopLine: "A co-op with quiet focus time is more likely to fit.",
    },
    middle: {
      headline: "You can work with people or on your own",
      coopLine: "A co-op that mixes teamwork and solo time is more likely to fit.",
    },
    high: {
      headline: "You gain energy around people",
      coopLine: "A co-op with people around you most of the day is more likely to fit.",
    },
  },
  agreeableness: {
    low: {
      headline: "You say what you think, even when it's direct",
      coopLine: "You'll likely do well where direct feedback is normal.",
    },
    middle: {
      headline: "You balance kindness with being direct",
      coopLine: "A team that is both supportive and honest is more likely to fit.",
    },
    high: {
      headline: "You look out for the people around you",
      coopLine: "You'll likely do well where the team trusts each other.",
    },
  },
  conscientiousness: {
    low: {
      headline: "You'd rather stay flexible than follow a strict plan",
      coopLine: "Work that changes day to day is more likely to fit.",
    },
    middle: {
      headline: "You can follow a plan or change course",
      coopLine: "A co-op with some structure and some room to adjust is more likely to fit.",
    },
    high: {
      headline: "You like a plan and you follow it",
      coopLine: "Structured work with clear deadlines is more likely to fit.",
    },
  },
  neuroticism: {
    low: {
      headline: "You stay steady when things get tense",
      coopLine: "A fast pace is less likely to throw you.",
    },
    middle: {
      headline: "Some pressure gets to you, and some doesn't",
      coopLine: "A team that names stress out loud is more likely to fit.",
    },
    high: {
      headline: "Stress hits you harder than most",
      coopLine: "A calmer week and a predictable team will help.",
    },
  },
  openness: {
    low: {
      headline: "You like proven methods more than experiments",
      coopLine: "A clear process you can master is more likely to fit.",
    },
    middle: {
      headline: "You like a mix of new ideas and proven methods",
      coopLine: "A co-op that teaches a method, then lets you try something new, is more likely to fit.",
    },
    high: {
      headline: "You like new ideas and unfamiliar problems",
      coopLine: "Open-ended problems are more likely to fit.",
    },
  },
};

const CATEGORY: Record<Trait, string> = {
  extraversion: "Around people",
  agreeableness: "With others",
  conscientiousness: "Planning",
  neuroticism: "Under stress",
  openness: "New ideas",
};

export function traitBand(score: number): TraitBand {
  if (score <= 10) return "low";
  if (score >= 15) return "high";
  return "middle";
}

/** The plain-language line for one trait at one band, e.g. "You like a plan and you follow it". */
export function traitHeadline(trait: Trait, band: TraitBand): string {
  return COPY[trait][band].headline;
}

export function readTraits(scores: TraitScores): TraitReading[] {
  return (Object.keys(COPY) as Trait[]).map((trait) => {
    const copy = COPY[trait][traitBand(scores[trait])];
    return {
      trait,
      category: CATEGORY[trait],
      headline: copy.headline,
      coopLine: copy.coopLine,
    };
  });
}
