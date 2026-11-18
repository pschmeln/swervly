import { FAMILY_SKILLS, MAJOR_SKILLS } from "@/content/major-skills";
import { majorFamily, matchCatalog } from "@/features/majors/catalog";
import type { SkillChoice } from "@/features/skills/rank";

/**
 * The skills to show first for a student's major. Empty for undecided or
 * custom (unlisted) majors, which then see every skill as before.
 */
export function skillsForMajor(user: { major: string | null; majorSource: string | null }): string[] {
  if (user.majorSource === "undecided" || user.majorSource === "custom") return [];
  const name = user.major?.trim() ?? "";
  if (!name) return [];
  const match = matchCatalog(name);
  if (!match || match.legacy) return [];
  const own = MAJOR_SKILLS[match.name];
  if (own) return [...own];
  return [...FAMILY_SKILLS[majorFamily(match.name)]];
}

/**
 * Split the form's skill choices into the major's skills (shown first, in the
 * major list's order) and the rest (behind "Show all skills"). A skill the
 * student already picked always stays visible.
 */
export function splitSkillChoices(
  choices: readonly SkillChoice[],
  majorSkills: readonly string[],
  selected: readonly string[],
): { primary: SkillChoice[]; rest: SkillChoice[] } {
  if (majorSkills.length === 0) return { primary: [...choices], rest: [] };
  const byName = new Map(choices.map((choice) => [choice.name, choice]));
  const primary: SkillChoice[] = [];
  const shown = new Set<string>();
  for (const name of majorSkills) {
    const choice = byName.get(name);
    if (choice && !shown.has(name)) {
      primary.push(choice);
      shown.add(name);
    }
  }
  for (const choice of choices) {
    if (!shown.has(choice.name) && selected.includes(choice.name)) {
      primary.push(choice);
      shown.add(choice.name);
    }
  }
  return { primary, rest: choices.filter((choice) => !shown.has(choice.name)) };
}
