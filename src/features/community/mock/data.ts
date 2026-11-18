/**
 * Prototype-only sample content.
 * Invented names and sentences. No real students, emails, or reviews.
 * This file has no imports and no database access. The explore view-model
 * is the only production-tree module allowed to read it, and only while the
 * prototype flag is on.
 */

export const UNCONSENTED_SAMPLE_MARKER = "UNCONSENTED-SAMPLE-NOTE-7F3A";

export type MockExperience = {
  id: string;
  companyId: string;
  role: string;
  authorLabel: string;
  body: string;
  sharingConsent: boolean;
};

export type MockAnswer = {
  id: string;
  authorLabel: string;
  body: string;
  sampleHelpfulCount: number;
};

export type MockQuestion = {
  id: string;
  scopeKind: "role" | "company";
  scopeId: string;
  scopeLabel: string;
  authorLabel: string;
  title: string;
  body: string;
  sampleHelpfulCount: number;
  answers: MockAnswer[];
};

export type MockReport = {
  id: string;
  targetLabel: string;
  reason: string;
};

export const MOCK_EXPERIENCES: readonly MockExperience[] = [
  {
    id: "exp-cchmc-shared",
    companyId: "cchmc",
    role: "Clinical operations",
    authorLabel: "Casey Sample",
    sharingConsent: true,
    body: "Invented sample: the team drew the clinic schedule on a whiteboard and named who to ask for help.",
  },
  {
    id: "exp-mayo-withheld",
    companyId: "mayo",
    role: "Clinical operations",
    authorLabel: "Hidden Sample",
    sharingConsent: false,
    body: `${UNCONSENTED_SAMPLE_MARKER} Invented note that must stay off the screen because sharing consent is off.`,
  },
];

export const MOCK_QUESTIONS: readonly MockQuestion[] = [
  {
    id: "q-clinic-week",
    scopeKind: "role",
    scopeId: "clinical-operations",
    scopeLabel: "Clinical operations",
    authorLabel: "Jordan Placeholder",
    title: "What does a week in clinic operations actually include?",
    body: "Invented sample question. I want the ordinary parts of the week, not a brochure.",
    sampleHelpfulCount: 2,
    answers: [
      {
        id: "a-clinic-whiteboard",
        authorLabel: "Casey Sample",
        body: "Invented sample answer: mornings were the schedule, and afternoons were a walk through the unit with a nurse lead.",
        sampleHelpfulCount: 1,
      },
    ],
  },
  {
    id: "q-community-ask",
    scopeKind: "role",
    scopeId: "community-programs",
    scopeLabel: "Community programs",
    authorLabel: "Avery Fiction",
    title: "What should I ask a community-program host before I say yes?",
    body: "Invented sample question with no answers yet.",
    sampleHelpfulCount: 0,
    answers: [],
  },
  {
    id: "q-cchmc-mentor",
    scopeKind: "company",
    scopeId: "cchmc",
    scopeLabel: "Cincinnati Children's",
    authorLabel: "Quinn Mock",
    title: "How do students find a person to ask for help on a hospital team?",
    body: "Invented sample question about a fictional hospital rotation.",
    sampleHelpfulCount: 1,
    answers: [],
  },
];

export const MOCK_REPORTS: readonly MockReport[] = [
  {
    id: "report-sample-1",
    targetLabel: "Sample question about a clinic week",
    reason: "Invented example for the concept view",
  },
];
