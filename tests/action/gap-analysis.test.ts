import { describe, expect, it } from "vitest";
import {
  analyzeSkillTargets,
  MIN_OCCUPATIONS_FOR_SHARED,
  openSkillTargets,
  progressLabel,
} from "@/features/action/gap-analysis";
import { resolveActionGoal } from "@/features/action/goal";
import { atlasGraph, childrenOf } from "@/features/atlas/graph";
import { ONET_DETAILS } from "@/content/atlas/onet-details";
import type { ActionGoal } from "@/features/action/types";

const graph = atlasGraph();

function goal(nodeId: string, source: ActionGoal["source"] = "manual"): ActionGoal {
  const result =
    source === "atlas_pursuing"
      ? resolveActionGoal({ mode: "atlas_pursuing" }, { graph, atlasPursuing: nodeId })
      : resolveActionGoal({ mode: "manual", nodeId }, { graph });
  if (!result.ok) throw new Error(result.message);
  return result.goal;
}

/** Find a specialization with enough occupation skill data to classify shared skills. */
function specializationWithOverlap(): { id: string; shared: string[] } {
  for (const spec of graph.data.specializations) {
    const occs = childrenOf(graph, spec.id).filter((node) => node.level === "occupation");
    const sets = occs.map((node) => {
      const code = node.id.replace("occ:onet:", "");
      return new Set(ONET_DETAILS[code]?.skills ?? []);
    }).filter((set) => set.size > 0);
    if (sets.length < MIN_OCCUPATIONS_FOR_SHARED) continue;
    const shared = [...sets[0]].filter((skill) => sets.every((set) => set.has(skill)));
    if (shared.length > 0) return { id: spec.id, shared };
  }
  throw new Error("expected at least one specialization with shared O*NET skills");
}

describe("analyzeSkillTargets", () => {
  it("for an occupation, lists O*NET standout skills as known shared targets with explanations", () => {
    const targets = analyzeSkillTargets(goal("occ:onet:17-2141.00"), graph);
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      expect(target.scope).toBe("shared");
      expect(target.evidence).toBe("known");
      expect(target.skillSource).toBe("onet");
      expect(target.explanation.length).toBeGreaterThan(10);
      expect(target.originKey.startsWith("onet-skill:")).toBe(true);
    }
  });

  it("for a specialization, separates shared, occupation-specific, and optional exploration", () => {
    const { id, shared } = specializationWithOverlap();
    const targets = analyzeSkillTargets(goal(id), graph);
    const byName = new Map(targets.map((target) => [target.name, target]));

    for (const name of shared) {
      expect(byName.get(name)?.scope).toBe("shared");
      expect(byName.get(name)?.evidence).toBe("known");
    }

    const scopes = new Set(targets.map((target) => target.scope));
    expect(scopes.has("shared")).toBe(true);
    // At least one non-shared classification should appear on a real overlapping specialization.
    expect([...scopes].some((scope) => scope !== "shared")).toBe(true);

    for (const target of targets) {
      expect(target.explanation.length).toBeGreaterThan(10);
    }
  });

  it("labels thin specialization evidence as suggested, not required", () => {
    // Pick a specialization with exactly one occupation that has skills, if any.
    const thin = graph.data.specializations.find((spec) => {
      const occs = childrenOf(graph, spec.id).filter((node) => node.level === "occupation");
      const withSkills = occs.filter((node) => {
        const code = node.id.replace("occ:onet:", "");
        return (ONET_DETAILS[code]?.skills.length ?? 0) > 0;
      });
      return withSkills.length === 1;
    });
    if (!thin) return; // map may not have a thin case; skip softly
    const targets = analyzeSkillTargets(goal(thin.id), graph);
    expect(targets.every((target) => target.evidence === "suggested" || target.evidence === "unknown")).toBe(true);
    expect(targets.every((target) => target.scope !== "shared")).toBe(true);
  });
});

describe("missing skill is not lacking skill", () => {
  it("unrated progress never means lacking", () => {
    expect(progressLabel(undefined)).toMatchObject({ progress: "unrated", meansLacking: false });
    expect(progressLabel("unrated").meansLacking).toBe(false);
    expect(progressLabel("learning").meansLacking).toBe(false);
    expect(progressLabel("comfortable").meansLacking).toBe(false);
  });

  it("openSkillTargets drops only comfortable ratings, not unrated ones", () => {
    const targets = analyzeSkillTargets(goal("occ:onet:17-2141.00"), graph);
    const first = targets[0];
    const open = openSkillTargets(targets, { [first.originKey]: "comfortable" });
    expect(open.find((target) => target.originKey === first.originKey)).toBeUndefined();
    expect(open.length).toBe(targets.length - 1);
  });
});
