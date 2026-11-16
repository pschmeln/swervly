import { z } from "zod";
import { INTEREST_ITEMS, INSTRUMENT } from "@/content/interest-items";
import { MAJORS } from "@/lib/constants";

const interestItemIds = INTEREST_ITEMS.map((item) => item.id) as [
  string,
  ...string[],
];

export const ProfileInput = z.object({
  school: z.string().trim().min(2).max(120),
  major: z.enum(MAJORS),
  year: z.int().min(1).max(5),
  coopTrack: z.string().max(40).optional(),
  goal: z.enum(["industry", "grad_school", "undecided"]),
  goalNotes: z.string().max(500).optional(),
  locationConstraint: z.enum(["cincinnati_only", "within_drive", "anywhere"]),
  constraintsNotes: z.string().max(500).optional(),
  consentPrivacy: z.literal(true),
  consentDataUse: z.literal(true),
});

export type ProfileInput = z.infer<typeof ProfileInput>;

export const AssessmentInput = z.object({
  instrument: z.literal(INSTRUMENT),
  answers: z.record(z.enum(interestItemIds), z.int().min(1).max(5)),
});

export type AssessmentInput = z.infer<typeof AssessmentInput>;
