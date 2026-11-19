import { describe, expect, it } from "vitest";
import { atlasEntry } from "@/features/atlas/entry";
import { atlasGraph } from "@/features/atlas/graph";
import { rankSpecializations, topPicks, type Signals } from "@/features/atlas/rank";
import { rootModel } from "@/features/atlas/view";

/**
 * The seven personas from the Career Atlas brief. Synthetic students only.
 * Each checks why the first screen looks the way it does, and how a few
 * interactions change the picks.
 */
const graph = atlasGraph();
const quiet: Signals = { answers: {}, interested: [], dismissed: [], directionInterested: [], directionDismissed: [] };
const none = { interested: [], dismissed: [] };

function picksFor(major: string | null, source: string, signals: Partial<Signals>) {
  const entry = atlasEntry(graph, { major, majorSource: source });
  return { entry, picks: topPicks(rankSpecializations(graph, entry, { ...quiet, ...signals }), entry) };
}
const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("Persona 1 and 2: same major, different interests", () => {
  const firstScreen = (major: string) => rootModel(graph, atlasEntry(graph, { major, majorSource: "catalog" }), none);

  it("start from the same first screen, because the major alone cannot separate them", () => {
    expect(firstScreen("Mechanical Engineering")).toEqual(firstScreen("Mechanical Engineering"));
  });

  it("Persona 1 (robotics, building): 'build' brings hands-on work up and simulation down", () => {
    const { picks } = picksFor("Mechanical Engineering", "catalog", { answers: { "build-vs-model": "a" } });
    expect(ids(picks.slice(0, 5))).not.toContain("spec:cfd-simulation");
    expect(ids(picks.slice(0, 5))).not.toContain("spec:structural-simulation");
  });

  it("Persona 1: questions cover kinds of work, not topics, so robotics leads once the student marks it Interested", () => {
    // Known limit: no question asks about robots specifically. Search + Interested is how a topic gets in.
    const { picks } = picksFor("Mechanical Engineering", "catalog", { answers: { "build-vs-model": "a" }, interested: ["spec:robotics-mech-design"] });
    expect(picks[0].id).toBe("spec:robotics-mech-design");
    expect(ids(picks.slice(0, 3))).not.toContain("spec:cfd-simulation");
  });

  it("Persona 2 (simulation, analysis) gets CAE and CFD, not automotive product development", () => {
    const { picks } = picksFor("Mechanical Engineering", "catalog", { answers: { "build-vs-model": "b", "code-vs-data": "b" } });
    expect(ids(picks.slice(0, 5))).toEqual(expect.arrayContaining(["spec:structural-simulation", "spec:cfd-simulation"]));
    expect(ids(picks.slice(0, 5))).not.toContain("spec:automotive-product-dev");
  });

  it("their picks differ", () => {
    const one = picksFor("Mechanical Engineering", "catalog", { answers: { "build-vs-model": "a" } }).picks;
    const two = picksFor("Mechanical Engineering", "catalog", { answers: { "build-vs-model": "b" } }).picks;
    expect(ids(one)).not.toEqual(ids(two));
  });
});

describe("Persona 3: computer science student interested in product management", () => {
  it("starts in software and data, and product management leads once marked Interested", () => {
    const entry = atlasEntry(graph, { major: "Computer Science", majorSource: "catalog" });
    expect(entry.kind === "major" && entry.families[0].family).toBe("fam:software-engineering");
    const { picks } = picksFor("Computer Science", "catalog", { interested: ["spec:tech-product-management"] });
    expect(picks[0].id).toBe("spec:tech-product-management");
    expect(picks[0].reasons).toContain("You marked this Interested.");
  });
});

describe("Persona 4: business student interested in finance", () => {
  it("starts in finance, and answers about data and models bring quantitative finance to the top", () => {
    const entry = atlasEntry(graph, { major: "Finance", majorSource: "catalog" });
    expect(entry.kind === "major" && entry.families[0].family).toBe("fam:finance");
    const { picks } = picksFor("Finance", "catalog", { answers: { "people-vs-data": "b", "build-vs-model": "b" } });
    expect(picks[0].id).toBe("spec:risk-quant");
  });
});

describe("Persona 5: nursing student interested in clinical practice", () => {
  it("starts in clinical care, and answering 'people' puts both nursing specializations first", () => {
    const { picks } = picksFor("Nursing", "catalog", { answers: { "people-vs-organize": "a" } });
    expect(ids(picks.slice(0, 2)).sort()).toEqual(["spec:advanced-practice-nursing", "spec:clinical-nursing"]);
    expect(ids(picks)).not.toContain("spec:robotics-mech-design");
  });

  it("answering 'out on a clinic floor' too puts hands-on clinical nursing first", () => {
    const { picks } = picksFor("Nursing", "catalog", { answers: { "people-vs-organize": "a", "test-vs-field": "b" } });
    expect(picks[0].id).toBe("spec:clinical-nursing");
  });

  it("marking health administration Not interested removes it", () => {
    const { picks } = picksFor("Nursing", "catalog", { answers: { "people-vs-organize": "a" }, dismissed: ["fam:health-administration"] });
    expect(ids(picks)).not.toContain("spec:health-services-management");
  });
});

describe("Persona 6: undecided student with little information", () => {
  it("sees every area alphabetically and no picks until they answer", () => {
    const entry = atlasEntry(graph, { major: null, majorSource: "undecided" });
    const root = rootModel(graph, entry, none);
    expect(root.groups[0].cards).toHaveLength(graph.data.domains.length);
    const { picks } = picksFor(null, "undecided", {});
    expect(picks).toEqual([]);
  });

  it("answers about people and planning lift people-facing work, with reasons that cite only those answers", () => {
    const { picks } = picksFor(null, "undecided", { answers: { "people-vs-organize": "both" } });
    expect(picks.length).toBeGreaterThan(0);
    for (const item of picks) {
      for (const reason of item.reasons) expect(reason.startsWith("You said you'd rather explore")).toBe(true);
    }
    expect(ids(picks)).not.toContain("spec:robotics-mech-design");
  });
});

describe("Persona 7: student exploring a career unrelated to their major", () => {
  it("an electrical engineering student who marks Finance Interested sees finance first, with EE still below", () => {
    const { picks } = picksFor("Electrical Engineering", "catalog", { interested: ["fam:finance"] });
    expect(graph.data.specializations.find((spec) => spec.id === picks[0].id)?.families).toContain("fam:finance");
    expect(picks.some((item) => item.family === "fam:electronics-hardware")).toBe(true);
  });
});
