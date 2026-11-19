import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildDirection, evidenceGroup } from "@/features/direction/rules";
import type { TraitScores } from "@/features/profile/scoring";
import { ROLE_TYPE_OPTIONS, ROLE_TYPE_VALUES } from "@/features/review/roles";

const traits: TraitScores = { extraversion: 18, agreeableness: 18, conscientiousness: 12, neuroticism: 8, openness: 12 };

describe("evidence groups", () => {
  it("puts engineering and computing in one group", () => {
    expect(evidenceGroup("Mechanical Engineering")).toBe("engineering");
    expect(evidenceGroup("Computer Science")).toBe("engineering");
  });

  it("keeps other majors in their own group", () => {
    expect(evidenceGroup("Nursing")).toBe("healthcare");
    expect(evidenceGroup("Psychology")).toBe("social_science");
    expect(evidenceGroup("Nursing")).not.toBe(evidenceGroup("Mechanical Engineering"));
  });

  it("gives undecided, custom and unknown majors no group", () => {
    expect(evidenceGroup("")).toBeNull();
    expect(evidenceGroup("Other")).toBeNull();
  });
});

describe("student evidence outside engineering", () => {
  it("uses evidence for a nursing student when similar students rated clinical work highly", () => {
    const direction = buildDirection({ traits, major: "Nursing", goal: "industry" }, [
      { userId: "a", traits, roleType: "healthcare_clinical", enjoyment: 5 },
      { userId: "b", traits, roleType: "healthcare_clinical", enjoyment: 4 },
    ]);
    expect(direction.suggestions[0]).toMatchObject({ roleType: "healthcare_clinical", source: "similar_students", sampleSize: 2 });
    expect(direction.basis).toBe("mixed");
    expect(direction.suggestions).toHaveLength(3);
  });

  it("never passes an engineering role to a nursing student as evidence", () => {
    const direction = buildDirection({ traits, major: "Nursing", goal: "industry" }, [
      { userId: "a", traits, roleType: "design", enjoyment: 5 },
      { userId: "b", traits, roleType: "design", enjoyment: 5 },
    ]);
    expect(direction.basis).toBe("rules");
    expect(direction.suggestions.map((item) => item.roleType)).not.toContain("design");
  });

  it("gives undecided students no student evidence", () => {
    const direction = buildDirection({ traits, major: "", goal: "industry" }, [
      { userId: "a", traits, roleType: "teaching", enjoyment: 5 },
      { userId: "b", traits, roleType: "teaching", enjoyment: 5 },
    ]);
    expect(direction.suggestions.every((item) => item.source === "rules")).toBe(true);
  });

  it("still needs a high average rating outside engineering", () => {
    const direction = buildDirection({ traits, major: "Nursing", goal: "industry" }, [
      { userId: "a", traits, roleType: "healthcare_clinical", enjoyment: 2 },
      { userId: "b", traits, roleType: "healthcare_clinical", enjoyment: 2 },
    ]);
    expect(direction.basis).toBe("rules");
  });
});

describe("co-op role types for every major", () => {
  it("lets the review form save a non-engineering role type", () => {
    expect(ROLE_TYPE_VALUES).toContain("healthcare_clinical");
    expect(ROLE_TYPE_OPTIONS.map((option) => option.value)).toEqual([...ROLE_TYPE_VALUES]);
    expect(ROLE_TYPE_VALUES.at(-1)).toBe("other");
  });

  it("allows exactly ROLE_TYPE_VALUES in migration 0008 and the schema check", () => {
    const sql = readFileSync(path.join(process.cwd(), "drizzle/0008_role_types_all_majors.sql"), "utf8");
    const schema = readFileSync(path.join(process.cwd(), "src/db/schema.ts"), "utf8");
    const list = `('${ROLE_TYPE_VALUES.join("', '")}')`;
    expect(sql).toContain(list);
    expect(schema).toContain(list);
    expect(sql).toContain('DROP CONSTRAINT "rotations_role_type"');
  });

  it("is the last migration in the journal", () => {
    const journal = JSON.parse(readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8")) as {
      entries: { tag: string; when: number }[];
    };
    const last = journal.entries.at(-1);
    expect(last?.tag).toBe("0008_role_types_all_majors");
    expect((last?.when ?? 0) > (journal.entries.at(-2)?.when ?? 0)).toBe(true);
  });
});
