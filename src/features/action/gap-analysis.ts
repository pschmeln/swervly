import { ONET_DETAILS } from "@/content/atlas/onet-details";
import { childrenOf, type AtlasGraph } from "@/features/atlas/graph";
import { atlasGraph } from "@/features/atlas/graph";
import type { AtlasNodeId } from "@/features/atlas/types";
import type { ActionGoal, EvidenceLevel, SkillProgress, SkillScope, SkillTarget } from "@/features/action/types";

/** Minimum occupations with skill data before we treat specialization overlap as "known". */
export const MIN_OCCUPATIONS_FOR_SHARED = 2;

export type OccupationSkillSet = {
  id: AtlasNodeId;
  title: string;
  onetCode: string;
  skills: readonly string[];
};

function originKeyFor(name: string): string {
  return `onet-skill:${name.trim().toLowerCase()}`;
}

function occupationSkillSets(graph: AtlasGraph, goal: ActionGoal): OccupationSkillSet[] {
  if (goal.level === "occupation") {
    if (!goal.onetCode) return [];
    const record = ONET_DETAILS[goal.onetCode];
    if (!record?.skills.length) return [];
    return [
      {
        id: goal.nodeId,
        title: goal.title,
        onetCode: goal.onetCode,
        skills: record.skills,
      },
    ];
  }

  return childrenOf(graph, goal.nodeId)
    .filter((node) => node.level === "occupation")
    .flatMap((node) => {
      const occupation = graph.data.occupations.find((item) => item.id === node.id);
      if (!occupation) return [];
      const record = ONET_DETAILS[occupation.onetCode];
      if (!record?.skills.length) return [];
      return [
        {
          id: node.id,
          title: node.title,
          onetCode: occupation.onetCode,
          skills: record.skills,
        },
      ];
    })
    .sort((left, right) => left.id.localeCompare(right.id));
}

function classifySpecializationSkill(
  name: string,
  sets: OccupationSkillSet[],
): Pick<SkillTarget, "scope" | "evidence" | "explanation" | "appearsIn"> {
  const appearsIn = sets.filter((set) => set.skills.includes(name)).map((set) => set.title);
  const count = appearsIn.length;
  const total = sets.length;

  if (total < MIN_OCCUPATIONS_FOR_SHARED) {
    return {
      scope: "optional_exploration",
      evidence: "suggested",
      appearsIn,
      explanation:
        total === 0
          ? "Swervly does not have enough official skill data for occupations in this area yet."
          : `Listed for ${appearsIn[0] ?? "one occupation"} in this area. With only one occupation's skills on file, this is a suggestion — not a shared requirement.`,
    };
  }

  if (count === total) {
    return {
      scope: "shared",
      evidence: "known",
      appearsIn,
      explanation: `Shows up as a standout skill across all ${total} mapped occupations in this specialization (O*NET).`,
    };
  }

  if (count === 1) {
    return {
      scope: "optional_exploration",
      evidence: "known",
      appearsIn,
      explanation: `Standout for ${appearsIn[0]} only among the ${total} mapped occupations here. Optional to explore — not shared across the area.`,
    };
  }

  return {
    scope: "occupation_specific",
    evidence: "known",
    appearsIn,
    explanation: `Standout for ${count} of ${total} mapped occupations in this area (${appearsIn.join(", ")}). Not shared by every occupation under this specialization.`,
  };
}

/**
 * Build skill targets for a goal. Missing O*NET data never means the student
 * "lacks" a skill — it means evidence is thin or absent.
 */
export function analyzeSkillTargets(goal: ActionGoal, graph: AtlasGraph = atlasGraph()): SkillTarget[] {
  const sets = occupationSkillSets(graph, goal);

  if (goal.level === "occupation") {
    if (sets.length === 0) {
      return [
        {
          name: "Skills not listed yet",
          scope: "optional_exploration",
          evidence: "unknown",
          skillSource: "editorial",
          originKey: "editorial:skills-unknown",
          explanation:
            "O*NET standout skills are not on file for this occupation in Swervly yet. That is missing data, not a claim that you lack skills.",
          appearsIn: [],
        },
      ];
    }
    return sets[0].skills.map((name) => ({
      name,
      scope: "shared" as SkillScope,
      evidence: "known" as EvidenceLevel,
      skillSource: "onet" as const,
      originKey: originKeyFor(name),
      explanation: `O*NET lists this among the standout skills for ${goal.title}.`,
      appearsIn: [goal.title],
    }));
  }

  if (sets.length === 0) {
    return [
      {
        name: "Skills not listed yet",
        scope: "optional_exploration",
        evidence: "unknown",
        skillSource: "editorial",
        originKey: "editorial:skills-unknown",
        explanation:
          "None of the occupations under this specialization have O*NET standout skills imported yet. Missing data is not the same as lacking a skill.",
        appearsIn: [],
      },
    ];
  }

  const names = [...new Set(sets.flatMap((set) => [...set.skills]))].sort((left, right) =>
    left.localeCompare(right),
  );

  return names.map((name) => {
    const classified = classifySpecializationSkill(name, sets);
    return {
      name,
      skillSource: "onet" as const,
      originKey: originKeyFor(name),
      ...classified,
    };
  });
}

/**
 * Interpret stored progress. No row / unrated = no judgment about ability.
 */
export function progressLabel(progress: SkillProgress | null | undefined): {
  progress: SkillProgress;
  meansLacking: false;
  label: string;
} {
  const value: SkillProgress = progress ?? "unrated";
  if (value === "learning") {
    return { progress: value, meansLacking: false, label: "You're building this — not a deficit score." };
  }
  if (value === "comfortable") {
    return { progress: value, meansLacking: false, label: "You marked yourself comfortable with this." };
  }
  return {
    progress: "unrated",
    meansLacking: false,
    label: "Not rated yet. Missing a rating is not the same as lacking the skill.",
  };
}

/** Skills the student has not marked comfortable — for display, never as "deficits". */
export function openSkillTargets(
  targets: readonly SkillTarget[],
  progressByOriginKey: Readonly<Record<string, SkillProgress>>,
): SkillTarget[] {
  return targets.filter((target) => {
    if (target.evidence === "unknown" && target.skillSource === "editorial") return true;
    const progress = progressByOriginKey[target.originKey] ?? "unrated";
    return progress !== "comfortable";
  });
}
