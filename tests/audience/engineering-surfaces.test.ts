import { describe, expect, it } from "vitest";
import { ONET_DETAILS } from "@/content/atlas/onet-details";
import { COMMUNITY_AREA_OPTIONS, COMMUNITY_ROLE_OPTIONS, PostInput } from "@/features/community/rules";
import { tagsFor } from "@/features/community/server";
import { buildDirection, type SimilarReview } from "@/features/direction/rules";
import { CATALOG_COMPANIES } from "@/features/explore/companies";
import { COMPANY_ROLE_FILTERS } from "@/features/explore/view-model";
import { atlasEntry } from "@/features/atlas/entry";
import { ATLAS_DATA, atlasGraph } from "@/features/atlas/graph";
import { toState } from "@/features/atlas/server";
import type { AtlasNodeId } from "@/features/atlas/types";
import { nodeModel } from "@/features/atlas/view";
import { resolveMajorWrite } from "@/features/majors/selection";
import type { TraitScores } from "@/features/profile/scoring";
import { showsFamily, showsRole } from "@/lib/audience";

const traits: TraitScores = { extraversion: 18, agreeableness: 18, conscientiousness: 12, neuroticism: 8, openness: 12 };
const roles = (major: string, reviews: readonly SimilarReview[] = []) =>
  buildDirection({ traits, major, goal: "industry" }, reviews).suggestions.map((item) => item.roleType);

describe("engineering audience on every surface", () => {
  it("never shows a hidden role as student evidence", () => {
    const reviews: SimilarReview[] = ["a", "b", "c"].map((userId) => ({ userId, traits, roleType: "marketing", enjoyment: 5 }));
    const shown = roles("Mechanical Engineering", reviews);
    expect(shown).not.toContain("marketing");
    expect(shown.length).toBeGreaterThan(0);
  });

  it("never suggests hidden roles to a student whose stored major is hidden", () => {
    for (const major of ["Nursing", "Marketing", "Elementary Education"]) {
      for (const role of roles(major)) expect(showsRole(role), `${major}: ${role}`).toBe(true);
    }
  });

  it("offers only shown roles and areas in Community, but still accepts old posts", () => {
    expect(COMMUNITY_ROLE_OPTIONS.every((option) => showsRole(option.value))).toBe(true);
    expect(COMMUNITY_AREA_OPTIONS.every((option) => showsFamily(option.value))).toBe(true);
    expect(COMMUNITY_AREA_OPTIONS.map((option) => option.value)).not.toContain("fam:clinical-care");
    const old = PostInput.safeParse({ kind: "question", title: "Old post", body: "", roleType: "teaching", atlasFamily: "fam:teaching-advising" });
    expect(old.success).toBe(true);
  });

  it("leaves hidden roles and areas off post tags", () => {
    const tags = tagsFor({ employerName: "GE Aerospace", roleType: "teaching", atlasFamily: "fam:clinical-care" });
    expect(tags).toEqual([{ kind: "company", label: "GE Aerospace" }]);
  });

  it("lists no hidden role on company cards or the company role filter", () => {
    for (const label of ["Marketing", "Healthcare — clinical", "Healthcare administration", "Policy and research"]) {
      expect(COMPANY_ROLE_FILTERS).not.toContain(label);
      for (const company of CATALOG_COMPANIES) expect(company.roleCategories).not.toContain(label);
    }
  });

  it("keeps a hidden major typed in as the student's own text, and refuses Undecided", () => {
    for (const majorSelection of [
      { source: "custom" as const, name: "Nursing" },
      { source: "catalog" as const, name: "Nursing" },
    ]) {
      const resolved = resolveMajorWrite({ majorSelection });
      expect(resolved.ok && resolved.write.source).toBe("custom");
    }
    expect(resolveMajorWrite({ majorSelection: { source: "undecided" } }).ok).toBe(false);
    const listed = resolveMajorWrite({ majorSelection: { source: "custom", name: "Mechanical Engineering" } });
    expect(listed.ok && listed.write.source).toBe("catalog");
  });

  it("drops a saved mark on a hidden career from the state, without touching the row", () => {
    const rows = [{ nodeId: "spec:physician", mark: "pursuing" }];
    const state = toState(rows, []);
    expect(state.pursuing).toBeNull();
    expect(state.interested).toEqual([]);
    expect(rows).toEqual([{ nodeId: "spec:physician", mark: "pursuing" }]);
  });

  it("lists no hidden occupation as Related in the career map", () => {
    const graph = atlasGraph();
    const all = new Set<string>(ATLAS_DATA.occupations.map((item) => item.id));
    const me = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
    let checked = 0;
    for (const occupation of graph.data.occupations) {
      const id = occupation.id as AtlasNodeId;
      const view = nodeModel(graph, me, id, [id], { interested: [], dismissed: [] }, []);
      for (const related of ONET_DETAILS[occupation.onetCode]?.related ?? []) {
        const relatedId = `occ:onet:${related.onetCode}`;
        if (all.has(relatedId) && !graph.nodes.has(relatedId as AtlasNodeId)) {
          checked += 1;
          expect(view?.details?.related.map((item) => item.title)).not.toContain(related.title);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});
