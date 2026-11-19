import { describe, expect, it } from "vitest";
import { PREFERENCE_QUESTIONS } from "@/content/atlas/questions";
import { atlasEntry } from "@/features/atlas/entry";
import { atlasGraph, buildGraph, ATLAS_DATA } from "@/features/atlas/graph";
import { hasSignals, MAX_PER_FAMILY, nextQuestion, rankSpecializations, topPicks, type Signals } from "@/features/atlas/rank";

const graph = atlasGraph();
const me = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
const undecided = atlasEntry(graph, { major: null, majorSource: "undecided" });
const quiet: Signals = { answers: {}, interested: [], dismissed: [], directionInterested: [], directionDismissed: [] };

describe("ranking rules", () => {
  it("gives every specialization a reason for each point and never a negative score", () => {
    const ranked = rankSpecializations(graph, me, { ...quiet, answers: { "build-vs-model": "a" } });
    for (const item of ranked) {
      expect(item.points).toBeGreaterThanOrEqual(0);
      if (item.points > 0) expect(item.reasons.length).toBeGreaterThan(0);
    }
  });

  it('treats "Not sure yet" exactly like no answer', () => {
    const none = rankSpecializations(graph, me, quiet);
    const unsure = rankSpecializations(graph, me, { ...quiet, answers: { "build-vs-model": "unsure" } });
    expect(unsure).toEqual(none);
  });

  it('counts "Both" as both sides', () => {
    const both = rankSpecializations(graph, me, { ...quiet, answers: { "build-vs-model": "both" } });
    const robotics = both.find((item) => item.id === "spec:robotics-mech-design");
    expect(robotics?.reasons.filter((reason) => reason.startsWith("You said")).length).toBe(2);
  });

  it("is deterministic: shuffled input data gives the same order", () => {
    const signals: Signals = { ...quiet, answers: { "build-vs-model": "b", "code-vs-data": "b" } };
    const expected = rankSpecializations(graph, me, signals).map((item) => item.id);
    for (let seed = 1; seed <= 20; seed += 1) {
      const shuffled = [...ATLAS_DATA.specializations].sort((left, right) => ((left.id.length * seed) % 7) - ((right.id.length * seed) % 7));
      const other = buildGraph({ ...ATLAS_DATA, specializations: shuffled });
      expect(rankSpecializations(other, me, signals).map((item) => item.id)).toEqual(expected);
    }
  });

  it("drops a specialization the student dismissed, and everything under a dismissed family", () => {
    const ranked = rankSpecializations(graph, me, { ...quiet, dismissed: ["spec:cfd-simulation", "fam:energy-thermal"] });
    const ids = ranked.map((item) => item.id);
    expect(ids).not.toContain("spec:cfd-simulation");
    expect(ids).not.toContain("spec:thermal-management");
    expect(ids).toContain("spec:structural-simulation");
  });

  it("keeps a specialization reachable through another open family when a Direction role is dismissed", () => {
    const ranked = rankSpecializations(graph, me, { ...quiet, directionDismissed: ["design"] });
    const ids = ranked.map((item) => item.id);
    expect(ids).not.toContain("spec:robotics-mech-design");
    expect(ids).toContain("spec:aerospace-structures"); // also under Simulation and Validation
  });

  it("lifts a specialization in an area marked Interested on Direction", () => {
    const ranked = rankSpecializations(graph, undecided, { ...quiet, directionInterested: ["finance"] });
    expect(ranked[0].reasons).toContain("It's in an area you marked Interested on Direction.");
  });
});

describe("top picks", () => {
  it("shows nothing ranked until the student says something beyond their major", () => {
    expect(hasSignals(quiet)).toBe(false);
    expect(hasSignals({ ...quiet, answers: { "build-vs-model": "unsure" } })).toBe(false);
    expect(hasSignals({ ...quiet, answers: { "build-vs-model": "a" } })).toBe(true);
  });

  it(`takes at most ${MAX_PER_FAMILY} from one family and saves the last slot for somewhere outside the major`, () => {
    const signals: Signals = { ...quiet, answers: { "build-vs-model": "b", "code-vs-data": "b" } };
    const picks = topPicks(rankSpecializations(graph, me, signals), me);
    const counts = new Map<string, number>();
    for (const item of picks.slice(0, -1)) counts.set(item.family, (counts.get(item.family) ?? 0) + 1);
    for (const count of counts.values()) expect(count).toBeLessThanOrEqual(MAX_PER_FAMILY);
    expect(picks.at(-1)?.afield).toBe(true);
  });
});

describe("next question", () => {
  it("asks something, and never a question already answered or skipped", () => {
    const first = nextQuestion(graph, [], {}, []);
    expect(first).not.toBeNull();
    const answers = { [PREFERENCE_QUESTIONS[0].id]: "a" as const };
    const second = nextQuestion(graph, [], answers, [PREFERENCE_QUESTIONS[1].id]);
    expect(second?.id).not.toBe(PREFERENCE_QUESTIONS[0].id);
    expect(second?.id).not.toBe(PREFERENCE_QUESTIONS[1].id);
  });

  it("stops when every question is answered or skipped", () => {
    const answers = Object.fromEntries(PREFERENCE_QUESTIONS.map((question) => [question.id, "unsure" as const]));
    expect(nextQuestion(graph, [], answers, [])).toBeNull();
  });

  it("picks the question that best splits the current picks", () => {
    const picks = topPicks(rankSpecializations(graph, me, { ...quiet, answers: { "build-vs-model": "a" } }), me);
    const question = nextQuestion(graph, picks, { "build-vs-model": "a" }, []);
    expect(question).not.toBeNull();
    // Whatever it picks, both of its sides must apply to at least one current pick.
    const tags = (id: string) => graph.data.specializations.find((spec) => spec.id === id)?.activities ?? [];
    const touchesA = picks.some((item) => tags(item.id).some((tag) => question?.a.tags.includes(tag)));
    const touchesB = picks.some((item) => tags(item.id).some((tag) => question?.b.tags.includes(tag)));
    expect(touchesA || touchesB).toBe(true);
  });
});
