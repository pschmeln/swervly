import { describe, expect, it } from "vitest";
import { FAMILY_SKILLS, MAJOR_SKILLS } from "@/content/major-skills";
import { SKILLS } from "@/content/skills";
import { CATALOG, MAJOR_CATEGORIES } from "@/features/majors/catalog";
import { skillsForMajor, splitSkillChoices } from "@/features/review/major-skills";
import type { SkillChoice } from "@/features/skills/rank";

const catalogSkills = new Set<string>(SKILLS);
const allLists = [...Object.values(MAJOR_SKILLS), ...Object.values(FAMILY_SKILLS)];

function choice(name: string): SkillChoice {
  return { name, kind: "technical", status: "approved" };
}

describe("major skill lists", () => {
  it("only name skills that exist in the catalog", () => {
    for (const list of allLists) {
      for (const name of list) expect(catalogSkills, name).toContain(name);
    }
  });

  it("have no duplicates and stay short enough to scan", () => {
    for (const list of allLists.filter((items) => items.length > 0)) {
      expect(new Set(list).size).toBe(list.length);
      expect(list.length).toBeGreaterThanOrEqual(6);
      expect(list.length).toBeLessThanOrEqual(10);
    }
  });

  it("give every engineering and computing major its own list", () => {
    const specific = CATALOG.filter(
      (major) =>
        !major.legacy &&
        (major.category === "Engineering & Technology" ||
          major.category === "Computer Science & Information Technology"),
    );
    for (const major of specific) expect(MAJOR_SKILLS[major.name], major.name).toBeDefined();
    for (const name of Object.keys(MAJOR_SKILLS)) {
      expect(CATALOG.some((major) => major.name === name), name).toBe(true);
    }
  });

  it("cover every major category with a family list", () => {
    expect(MAJOR_CATEGORIES.length).toBe(12);
    for (const [family, list] of Object.entries(FAMILY_SKILLS)) {
      if (family !== "unknown") expect(list.length, family).toBeGreaterThan(0);
    }
  });

  it("uses every catalog skill in at least one list", () => {
    const used = new Set(allLists.flat());
    const unused = SKILLS.filter((name) => !used.has(name));
    expect(unused).toEqual([]);
  });
});

describe("skillsForMajor", () => {
  it("uses the major's own list", () => {
    expect(skillsForMajor({ major: "Electrical Engineering", majorSource: "catalog" })[0]).toBe("Circuit design");
  });

  it("ignores spaces around a saved major", () => {
    expect(skillsForMajor({ major: "  Electrical Engineering ", majorSource: null })).toEqual(
      MAJOR_SKILLS["Electrical Engineering"],
    );
  });

  it("falls back to the family list", () => {
    expect(skillsForMajor({ major: "Marketing", majorSource: "catalog" })).toEqual(FAMILY_SKILLS.business);
    expect(skillsForMajor({ major: "Nursing", majorSource: "catalog" })).toContain("Patient care");
  });

  it("shows everything for undecided, custom or unknown majors", () => {
    expect(skillsForMajor({ major: null, majorSource: "undecided" })).toEqual([]);
    expect(skillsForMajor({ major: "Underwater Basket Weaving", majorSource: "custom" })).toEqual([]);
    expect(skillsForMajor({ major: "Not a real major", majorSource: null })).toEqual([]);
  });
});

describe("splitSkillChoices", () => {
  const choices = ["Programming", "CAD", "Circuit design", "Sales", "Embedded systems"].map(choice);

  it("puts the major's skills first, in the major list's order", () => {
    const { primary, rest } = splitSkillChoices(choices, ["Circuit design", "Embedded systems", "Missing"], []);
    expect(primary.map((item) => item.name)).toEqual(["Circuit design", "Embedded systems"]);
    expect(rest.map((item) => item.name)).toEqual(["Programming", "CAD", "Sales"]);
  });

  it("keeps an already picked skill visible", () => {
    const { primary, rest } = splitSkillChoices(choices, ["Circuit design"], ["Sales"]);
    expect(primary.map((item) => item.name)).toEqual(["Circuit design", "Sales"]);
    expect(rest.map((item) => item.name)).not.toContain("Sales");
  });

  it("shows every skill when the major has no list", () => {
    const { primary, rest } = splitSkillChoices(choices, [], []);
    expect(primary).toHaveLength(choices.length);
    expect(rest).toEqual([]);
  });
});
