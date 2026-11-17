import { z } from "zod";
import { INSTRUMENT, QUIZ_ITEMS } from "@/content/mini-ipip";
import { PASSWORD_TOO_LONG_BYTES, utf8ByteLength } from "@/features/auth/password-messages";
import { MAJORS } from "@/lib/constants";

const quizItemIds = QUIZ_ITEMS.map((item) => item.id) as [string, ...string[]];

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
  /** When true, grants versioned share-reviews consent (onboarding). Omitted on profile edits. */
  consentShareReviews: z.boolean().optional(),
});

export type ProfileInput = z.infer<typeof ProfileInput>;

export const AssessmentInput = z.object({
  instrument: z.literal(INSTRUMENT),
  answers: z.record(z.enum(quizItemIds), z.int().min(1).max(5)),
});

export type AssessmentInput = z.infer<typeof AssessmentInput>;

export const PasswordInput = z.object({
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters." })
    .refine((value) => utf8ByteLength(value) <= 72, {
      error: PASSWORD_TOO_LONG_BYTES,
    }),
});

export const ShareDefaultInput = z.object({
  shareFreeTextDefault: z.boolean(),
  shareReviewsConsent: z.boolean().optional(),
});

export const FeedbackInput = z.object({
  page: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1, { error: "Write a short note." }).max(2000, {
    error: "Use 2000 characters or fewer.",
  }),
});

export type PasswordInput = z.infer<typeof PasswordInput>;
export type ShareDefaultInput = z.infer<typeof ShareDefaultInput>;
export type FeedbackInput = z.infer<typeof FeedbackInput>;
