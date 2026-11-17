export type SkillChoice = {
  name: string;
  kind: "technical" | "non_technical";
  status: "approved" | "pending";
};

export function normalizeSkillName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Higher company counts come first. Ties keep the catalog order. */
export function orderSkills(
  skills: readonly SkillChoice[],
  counts: Readonly<Record<string, number>>,
): SkillChoice[] {
  return skills
    .map((skill, index) => ({ skill, index, count: counts[skill.name] ?? 0 }))
    .sort((left, right) => {
      if (right.count !== left.count) return right.count - left.count;
      return left.index - right.index;
    })
    .map((row) => row.skill);
}
