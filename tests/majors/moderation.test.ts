import { describe, expect, it } from "vitest";
import { isFounderEmail } from "@/lib/founders";
import { moderateMajor } from "@/features/majors/moderate";
import { planMajorModeration, publicNamesAfterPlan } from "@/features/majors/moderation-plan";

const pending = {
  status: "pending",
  rawName: "Historic Preservation",
  normalizedName: "historic preservation",
};

describe("major approval permissions", () => {
  it("refuses a non-founder before reading submissions", async () => {
    const previous = process.env.FOUNDER_EMAILS;
    process.env.FOUNDER_EMAILS = "founder@school.edu";
    try {
      expect(isFounderEmail("student@school.edu")).toBe(false);
      await expect(
        moderateMajor("student@school.edu", {
          action: "approve",
          kind: "major",
          id: "11111111-1111-4111-8111-111111111111",
        }),
      ).rejects.toMatchObject({ status: 404 });
    } finally {
      if (previous === undefined) delete process.env.FOUNDER_EMAILS;
      else process.env.FOUNDER_EMAILS = previous;
    }
  });

  it("approves a new name, merges duplicates, and keeps rejects off the public list", () => {
    const existing = ["Computer Science", "Nursing"];
    const approved = planMajorModeration({ action: "approve", submission: pending });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.plan.type).toBe("approve_new");
    expect(publicNamesAfterPlan(existing, approved.plan)).toContain("Historic Preservation");

    const alias = planMajorModeration({
      action: "approve",
      submission: { status: "pending", rawName: "Comp Sci", normalizedName: "comp sci" },
    });
    expect(alias.ok).toBe(true);
    if (!alias.ok) return;
    expect(alias.plan).toMatchObject({ type: "merge", canonicalName: "Computer Science" });
    expect(publicNamesAfterPlan(existing, alias.plan)).toEqual(existing);

    const merged = planMajorModeration({
      action: "merge",
      submission: pending,
      intoName: "Nursing",
    });
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.plan).toMatchObject({ type: "merge", canonicalName: "Nursing", addAlias: true });
    expect(publicNamesAfterPlan(existing, merged.plan)).not.toContain("Historic Preservation");

    const rejected = planMajorModeration({ action: "reject", submission: pending });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.plan.type).toBe("reject");
    expect(publicNamesAfterPlan(existing, rejected.plan)).toEqual(existing);
  });

  it("does not merge into the legacy Other bucket", () => {
    const planned = planMajorModeration({
      action: "merge",
      submission: pending,
      intoName: "Other",
    });
    expect(planned.ok).toBe(false);
  });
});
