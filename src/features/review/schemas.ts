import { z } from "zod";

import { PlaceGeoid } from "@/features/location/schemas";
import { ROLE_TYPE_VALUES } from "@/features/review/roles";
import { WOULD_RETURN_VALUES } from "@/features/review/would-return";
import { MAX_ROTATIONS } from "@/lib/constants";

const currentYear = new Date().getFullYear();

function hasAtMostTwoDecimals(value: number): boolean {
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-8;
}

export const EmployerCreateInput = z.object({
  name: z.string().trim().min(2, { error: "Enter an employer name (2–80 characters)." }).max(80, {
    error: "Enter an employer name (2–80 characters).",
  }),
  city: z.string().trim().max(60).optional(),
  industry: z.string().trim().max(60).optional(),
});

export type EmployerCreateInput = z.infer<typeof EmployerCreateInput>;

const ReviewFields = z.object({
  enjoyment: z.number({ error: "Choose a rating from 1 to 5." }).int().min(1).max(5),
  learning: z.number({ error: "Choose a rating from 1 to 5." }).int().min(1).max(5),
  mentorship: z.number({ error: "Choose a rating from 1 to 5." }).int().min(1).max(5),
  clarityGained: z.number({ error: "Choose a rating from 1 to 5." }).int().min(1).max(5),
  skillsUsed: z
    .array(
      z.string().trim().min(1, { error: "Skill names can't be empty." }).max(60, {
        error: "Use 60 characters or fewer for a skill.",
      }),
    )
    .max(10, { error: "Pick up to 10 skills." })
    .refine((skills) => new Set(skills).size === skills.length, {
      error: "Pick each skill once.",
    }),
  freeText: z.string().max(2000, { error: "Use 2000 characters or fewer." }).optional(),
  shareFreeText: z.boolean(),
});

export const RotationInput = z
  .object({
    employerId: z.uuid({ error: "Select or add an employer." }),
    roleTitle: z.string().trim().min(2, { error: "Enter a role title (2–80 characters)." }).max(80, {
      error: "Enter a role title (2–80 characters).",
    }),
    roleType: z.enum(ROLE_TYPE_VALUES, { error: "Choose a role type." }),
    termSeason: z.enum(["spring", "summer", "fall"], { error: "Choose a term." }),
    termYear: z.number().int().min(2015).max(currentYear, { error: "Choose a year that has already started." }),
    rotationNumber: z.number().int().min(1).max(MAX_ROTATIONS, { error: `Choose a number from 1 to ${MAX_ROTATIONS}.` }),
    payHourly: z
      .number()
      .min(0, { error: "Enter an hourly pay from 0 to 200." })
      .max(200, { error: "Enter an hourly pay from 0 to 200." })
      .refine(hasAtMostTwoDecimals, {
        error: "Enter pay with at most 2 decimal places.",
      })
      .optional(),
    wouldReturn: z.enum(WOULD_RETURN_VALUES, { error: "Choose yes, maybe, or no." }),
    // Optional city where the co-op was (D7). Resolved to a Census place on the server.
    workPlaceGeoid: PlaceGeoid.nullable().optional(),
    review: ReviewFields,
  })
  .transform((input) => {
    const freeText = input.review.freeText?.trim() ?? "";
    const shareFreeText = freeText.length > 0 && input.review.shareFreeText;
    return {
      ...input,
      review: {
        ...input.review,
        freeText: freeText.length > 0 ? freeText : undefined,
        shareFreeText,
      },
    };
  });

export type RotationInput = z.infer<typeof RotationInput>;

export const SkillCreateInput = z.object({
  name: z.string().trim().min(2, { error: "Enter a skill (2–60 characters)." }).max(60, {
    error: "Enter a skill (2–60 characters).",
  }),
  kind: z.enum(["technical", "non_technical"], { error: "Choose technical or non-technical." }),
});

export type SkillCreateInput = z.infer<typeof SkillCreateInput>;

export const CompanyPreviewInput = z.object({
  employerId: z.uuid(),
  rotationId: z.uuid().optional(),
  roleType: z.enum(ROLE_TYPE_VALUES),
  wouldReturn: z.enum(WOULD_RETURN_VALUES),
  payHourly: z.number().min(0).max(200).optional(),
  enjoyment: z.number().int().min(1).max(5),
  learning: z.number().int().min(1).max(5),
  mentorship: z.number().int().min(1).max(5),
  clarityGained: z.number().int().min(1).max(5),
  skillsUsed: z.array(z.string().trim().min(1).max(60)).max(10),
  freeText: z.string().max(2000).optional(),
  shareFreeText: z.boolean(),
});

export type CompanyPreviewInput = z.infer<typeof CompanyPreviewInput>;

export const ModerationInput = z
  .object({
    action: z.enum(["approve", "reject", "merge"]),
    kind: z.enum(["skill", "employer"]),
    id: z.uuid(),
    intoId: z.uuid().optional(),
    intoName: z.string().trim().min(1).max(60).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.action !== "merge") return;
    if (input.kind === "employer" && !input.intoId) {
      ctx.addIssue({ code: "custom", path: ["intoId"], message: "Choose a company to merge into." });
    }
    if (input.kind === "skill" && !input.intoName) {
      ctx.addIssue({ code: "custom", path: ["intoName"], message: "Choose a skill to merge into." });
    }
  });

export type ModerationInput = z.infer<typeof ModerationInput>;
