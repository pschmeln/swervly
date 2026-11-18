import type { Trait } from "@/content/mini-ipip";

/**
 * Majors Direction can suggest, each tied to one quiz trait, so the
 * description speaks to the student's own result (founder request, Nov 18,
 * 2026). The trait is a clue, not a fit score.
 *
 * `fits` is the band that usually suits the major. `why` finishes the sentence
 * "<Major> ..." and says what the work is like.
 */
export type MajorTraitLink = {
  name: string;
  trait: Exclude<Trait, "neuroticism">;
  fits: "high" | "low";
  why: string;
};

export const INDUSTRY_MAJORS: readonly MajorTraitLink[] = [
  { name: "Business Administration", trait: "extraversion", fits: "high", why: "means working with clients and teams most days" },
  { name: "Nursing", trait: "agreeableness", fits: "high", why: "is built around caring for patients" },
  { name: "Computer Science", trait: "openness", fits: "high", why: "is solving new problems with code" },
  { name: "Psychology", trait: "agreeableness", fits: "high", why: "is about understanding how people think and feel" },
  { name: "Accounting", trait: "conscientiousness", fits: "high", why: "rewards accuracy and hitting deadlines" },
  { name: "Marketing", trait: "extraversion", fits: "high", why: "means pitching ideas and reading what people want" },
  { name: "Supply Chain Management", trait: "conscientiousness", fits: "high", why: "is keeping plans, schedules and shipments on track" },
  { name: "Graphic Design", trait: "openness", fits: "high", why: "is turning new ideas into something people can see" },
];

export const GRAD_MAJORS: readonly MajorTraitLink[] = [
  { name: "Biology", trait: "openness", fits: "high", why: "is chasing open questions in the lab and the field" },
  { name: "Psychology", trait: "openness", fits: "high", why: "asks open questions about how people think" },
  { name: "Economics", trait: "conscientiousness", fits: "high", why: "means careful models and patient work with data" },
  { name: "Mathematics", trait: "openness", fits: "high", why: "is working on abstract problems no one has solved yet" },
  { name: "Physics", trait: "openness", fits: "high", why: "asks how the world works at its most basic level" },
  { name: "Chemistry", trait: "conscientiousness", fits: "high", why: "rewards precise, careful lab work" },
  { name: "Neuroscience", trait: "openness", fits: "high", why: "studies how the brain works, a field full of open questions" },
  { name: "Public Health", trait: "agreeableness", fits: "high", why: "is improving the health of whole communities" },
];
