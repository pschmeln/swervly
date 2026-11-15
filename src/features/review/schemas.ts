import { z } from "zod";

import { SKILLS } from "@/content/skills";

const currentYear = new Date().getFullYear();

function hasAtMostTwoDecimals(value: number): boolean {
  const scaled = value * 100;
  return Math.abs(scaled - Math.round(scaled)) < 1e-8;
}

export const EmployerCreateInput = z.object({
  name: z.string().min(2).max(80),
  city: z.string().max(60).optional(),
  industry: z.string().max(60).optional(),
});

export type EmployerCreateInput = z.infer<typeof EmployerCreateInput>;

const ReviewInput = z
  .object({
    enjoyment: z.number().int().min(1).max(5),
    learning: z.number().int().min(1).max(5),
    mentorship: z.number().int().min(1).max(5),
    clarityGained: z.number().int().min(1).max(5),
    skillsUsed: z
      .array(z.enum(SKILLS))
      .max(10)
      .refine((skills) => new Set(skills).size === skills.length, {
        message: "skillsUsed must not contain duplicates",
      }),
    freeText: z.string().max(2000).optional(),
    shareFreeText: z.boolean(),
  })
  .refine(
    (review) =>
      !review.shareFreeText ||
      (typeof review.freeText === "string" && review.freeText.trim().length > 0),
    {
      message: "shareFreeText requires non-empty freeText",
      path: ["shareFreeText"],
    },
  );

export const RotationInput = z.object({
  employerId: z.uuid(),
  roleTitle: z.string().min(2).max(80),
  termSeason: z.enum(["spring", "summer", "fall"]),
  termYear: z.number().int().min(2015).max(currentYear),
  rotationNumber: z.number().int().min(1).max(5),
  payHourly: z
    .number()
    .min(0)
    .max(200)
    .refine(hasAtMostTwoDecimals, {
      message: "payHourly may have at most 2 decimal places",
    })
    .optional(),
  returnOffer: z.enum(["yes", "no", "pending", "not_applicable"]),
  review: ReviewInput,
});

export type RotationInput = z.infer<typeof RotationInput>;
