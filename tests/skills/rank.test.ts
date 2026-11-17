import { describe, expect, it } from "vitest";
import { orderSkills, type SkillChoice } from "@/features/skills/rank";

const choices: SkillChoice[] = [
  { name: "Programming", kind: "technical", status: "approved" },
  { name: "CAD", kind: "technical", status: "approved" },
  { name: "Presenting", kind: "non_technical", status: "approved" },
];

describe("orderSkills", () => {
  it("puts CAD first after three reviews tick it", () => {
    const ordered = orderSkills(choices, { CAD: 3, Programming: 1 });
    expect(ordered[0]?.name).toBe("CAD");
  });
});
