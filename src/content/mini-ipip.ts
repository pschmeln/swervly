// Mini-IPIP, 20 items, four per Big Five trait.
// Original wording is the public-domain IPIP item text used by Donnellan,
// Oswald, Baird, and Lucas (2006), in the usual administration order.
// `text` is a light Swervly reword. Meaning and keying match `original`.
// Version the file when items change. Do not migrate old answers.
//
// Important: reworded item text is for student clarity. Scores from this
// questionnaire should not automatically be treated as having the same
// validation evidence as the original Mini-IPIP instrument. Treat results as
// exploratory self-reflection, not a clinical or hiring assessment.

export const INSTRUMENT = "mini_ipip_20";
export const CONTENT_VERSION = 1;

/** Shown with the quiz. Confident about what the answers are for; no clinical or hiring claim. */
export const QUIZ_INTRO =
  "Answer for how you usually are, not how you'd like to be. Swervly uses your answers to match you with roles that fit how you work.";

export const RESPONSE_LABELS = [
  "Very inaccurate",
  "Moderately inaccurate",
  "Neither inaccurate nor accurate",
  "Moderately accurate",
  "Very accurate",
] as const;

export const TRAITS = [
  "extraversion",
  "agreeableness",
  "conscientiousness",
  "neuroticism",
  "openness",
] as const;

export type Trait = (typeof TRAITS)[number];
export type ItemKeying = "forward" | "reverse";

export type QuizItem = {
  id: string;
  trait: Trait;
  keyed: ItemKeying;
  original: string;
  text: string;
};

export const QUIZ_ITEMS: readonly QuizItem[] = [
  { id: "q01", trait: "extraversion", keyed: "forward", original: "Am the life of the party.", text: "I'm the person who gets a room going." },
  { id: "q02", trait: "agreeableness", keyed: "forward", original: "Sympathize with others' feelings.", text: "I feel for people when something is hard for them." },
  { id: "q03", trait: "conscientiousness", keyed: "forward", original: "Get chores done right away.", text: "I get tasks done right away." },
  { id: "q04", trait: "neuroticism", keyed: "forward", original: "Have frequent mood swings.", text: "My mood shifts a lot." },
  { id: "q05", trait: "openness", keyed: "forward", original: "Have a vivid imagination.", text: "I picture things in a lot of detail." },
  { id: "q06", trait: "extraversion", keyed: "reverse", original: "Don't talk a lot.", text: "I don't talk a lot." },
  { id: "q07", trait: "agreeableness", keyed: "reverse", original: "Am not interested in other people's problems.", text: "I'm not that interested in other people's problems." },
  { id: "q08", trait: "conscientiousness", keyed: "reverse", original: "Often forget to put things back in their proper place.", text: "I often forget to put things back where they belong." },
  { id: "q09", trait: "neuroticism", keyed: "reverse", original: "Am relaxed most of the time.", text: "I'm relaxed most of the time." },
  { id: "q10", trait: "openness", keyed: "reverse", original: "Am not interested in abstract ideas.", text: "Abstract ideas don't interest me much." },
  { id: "q11", trait: "extraversion", keyed: "forward", original: "Talk to a lot of different people at parties.", text: "At a gathering, I talk to a lot of different people." },
  { id: "q12", trait: "agreeableness", keyed: "forward", original: "Feel others' emotions.", text: "I pick up on how other people are feeling." },
  { id: "q13", trait: "conscientiousness", keyed: "forward", original: "Like order.", text: "I like things to be in order." },
  { id: "q14", trait: "neuroticism", keyed: "forward", original: "Get upset easily.", text: "I get upset easily." },
  { id: "q15", trait: "openness", keyed: "reverse", original: "Have difficulty understanding abstract ideas.", text: "Abstract ideas are hard for me to follow." },
  { id: "q16", trait: "extraversion", keyed: "reverse", original: "Keep in the background.", text: "I tend to stay in the background." },
  { id: "q17", trait: "agreeableness", keyed: "reverse", original: "Am not really interested in others.", text: "I'm not really that interested in other people." },
  { id: "q18", trait: "conscientiousness", keyed: "reverse", original: "Make a mess of things.", text: "I make a mess of things." },
  { id: "q19", trait: "neuroticism", keyed: "reverse", original: "Seldom feel blue.", text: "I rarely feel down." },
  { id: "q20", trait: "openness", keyed: "reverse", original: "Do not have a good imagination.", text: "I don't have a strong imagination." },
];
