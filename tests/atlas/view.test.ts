import { describe, expect, it } from "vitest";
import { FORBIDDEN_PROTOTYPE_CLAIM } from "@/features/explore/local-state";
import { atlasEntry } from "@/features/atlas/entry";
import { atlasGraph } from "@/features/atlas/graph";
import { atlasPrototypeEnabled } from "@/features/atlas/prototype";
import type { AtlasNodeId } from "@/features/atlas/types";
import { defaultTrail, nodeModel, onetOnlineHref, rootModel, searchAtlas, type Marks } from "@/features/atlas/view";

const graph = atlasGraph();
const none: Marks = { interested: [], dismissed: [] };
const me = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
const undecided = atlasEntry(graph, { major: null, majorSource: "undecided" });

function allText(value: unknown): string {
  return JSON.stringify(value);
}

describe("Atlas first screen", () => {
  it("leads a Mechanical Engineering student with the common ME families, with reasons", () => {
    const root = rootModel(graph, me, none);
    expect(root.heading).toBe("Starting from Mechanical Engineering");
    expect(root.groups[0].cards.map((item) => item.id)).toEqual([
      "fam:design-development",
      "fam:manufacturing-automation",
      "fam:simulation-validation",
      "fam:energy-thermal",
    ]);
    expect(root.groups[0].cards[0].why).toBe("Mechanical Engineering students often explore this.");
    expect(root.groups.some((group) => group.title === "Further afield")).toBe(true);
  });

  it("shows an undecided student every area alphabetically, with no reasons that imply ranking", () => {
    const root = rootModel(graph, undecided, none);
    expect(root.groups).toHaveLength(1);
    const titles = root.groups[0].cards.map((item) => item.title);
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    expect(root.groups[0].cards.every((item) => item.why === null)).toBe(true);
  });

  it("leaves families tied only to a dismissed Direction role off the first screen", () => {
    const root = rootModel(graph, me, none, ["design"]);
    const ids = root.groups.flatMap((group) => group.cards.map((item) => item.id));
    expect(ids).not.toContain("fam:design-development");
    expect(ids).toContain("fam:simulation-validation");
  });

  it("drops a family the student marked Not interested from the first screen", () => {
    const root = rootModel(graph, me, { interested: [], dismissed: ["fam:energy-thermal"] });
    expect(root.groups[0].cards.map((item) => item.id)).not.toContain("fam:energy-thermal");
  });
});

describe("Atlas drill-down", () => {
  it("lists a family's specializations and explains why it is shown", () => {
    const trail: AtlasNodeId[] = ["dom:engineering", "fam:simulation-validation"];
    const view = nodeModel(graph, me, "fam:simulation-validation", trail, none, []);
    expect(view?.children.map((item) => item.id)).toContain("spec:cfd-simulation");
    expect(view?.why[0]).toBe("Mechanical Engineering students often explore this.");
    expect(view?.childrenHeading).toBe("Specializations");
  });

  it("shows where else an occupation sits, excluding the path the student came from", () => {
    const trail: AtlasNodeId[] = ["dom:engineering", "fam:simulation-validation", "spec:cfd-simulation", "occ:onet:17-2141.00"];
    const view = nodeModel(graph, me, "occ:onet:17-2141.00", trail, none, []);
    expect(view?.onetCode).toBe("17-2141.00");
    expect(view?.badge).toBe("Official occupation · O*NET");
    const labels = view?.alsoUnder.map((item) => item.label) ?? [];
    expect(labels.some((label) => label.includes("Structural simulation"))).toBe(true);
    expect(labels.some((label) => label.endsWith("CFD simulation"))).toBe(false);
    expect(view?.details?.description).toContain("designing tools, engines, machines");
    expect(view?.details?.software).toContain("Dassault Systemes SolidWorks");
    expect(view?.details?.skills).toContain("Technology Design");
    expect(view?.details?.jobZone?.education).toContain("bachelor's degree");
    const related = view?.details?.related ?? [];
    expect(related.find((item) => item.title === "Mechatronics Engineers")?.id).toBe("occ:onet:17-2199.05");
    expect(related.find((item) => item.title === "Mechanical Engineering Technologists and Technicians")?.id).toBeNull();
    expect(view?.unknowns.join(" ")).not.toContain("hasn't added the O*NET description");
  });

  it("moves children of a dismissed Direction role into the hidden list", () => {
    const trail: AtlasNodeId[] = ["dom:engineering"];
    const view = nodeModel(graph, me, "dom:engineering", trail, none, ["design"]);
    expect(view?.hiddenChildren.map((item) => item.id)).toContain("fam:design-development");
    expect(view?.children.map((item) => item.id)).toContain("fam:simulation-validation");
  });

  it("flags product management as having only the closest official categories", () => {
    const view = nodeModel(graph, me, "spec:tech-product-management", defaultTrail(graph, "spec:tech-product-management"), none, []);
    expect(view?.closestOnly).toBe(true);
  });

  it("never says fit score, match percentage or hiring in Swervly's own wording", () => {
    const screens: unknown[] = [rootModel(graph, me, none), rootModel(graph, undecided, none)];
    for (const node of graph.nodes.values()) {
      const view = nodeModel(graph, me, node.id, defaultTrail(graph, node.id), none, ["design"]);
      // Verbatim O*NET text is quoted, not claimed by Swervly (e.g. "published materials" for Technical Writers).
      screens.push(view ? { ...view, details: null } : view);
    }
    const text = allText(screens);
    expect(text).not.toMatch(FORBIDDEN_PROTOTYPE_CLAIM);
    expect(text).not.toMatch(/\d+\s*%/);
  });
});

describe("Atlas search and links", () => {
  it("finds careers across levels, broadest first", () => {
    const results = searchAtlas(graph, "robot");
    expect(results.map((item) => item.id)).toContain("occ:onet:17-2199.08");
    expect(results[0].level).toBe("specialization");
  });

  it("needs at least two characters", () => {
    expect(searchAtlas(graph, "r")).toEqual([]);
  });

  it("only builds O*NET OnLine links from a well-formed code", () => {
    expect(onetOnlineHref("17-2141.00")).toBe("https://www.onetonline.org/link/summary/17-2141.00");
    expect(onetOnlineHref("17-2141.00/../../evil")).toBeNull();
  });
});

describe("Atlas prototype switch", () => {
  it("is off in production and on in preview and locally", () => {
    expect(atlasPrototypeEnabled({ VERCEL_ENV: "production" })).toBe(false);
    expect(atlasPrototypeEnabled({ VERCEL_ENV: "preview" })).toBe(true);
    expect(atlasPrototypeEnabled({})).toBe(true);
  });
});
