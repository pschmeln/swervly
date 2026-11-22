import { describe, expect, it, vi } from "vitest";
import { atlasEntry } from "@/features/atlas/entry";
import { atlasGraph } from "@/features/atlas/graph";

// These tests cover every major and career, including those hidden from engineering students.
vi.mock("@/lib/audience", () => import("../helpers/audience-all"));

const graph = atlasGraph();
const PRIVATE_TEXT = "Underwater Basketry and Secret Studies";

describe("Atlas entry point (cold start)", () => {
  it("opens the common Mechanical Engineering families first, plus one further afield", () => {
    const entry = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
    expect(entry.kind).toBe("major");
    if (entry.kind !== "major") return;
    expect(entry.label).toBe("Mechanical Engineering");
    expect(entry.families.slice(0, 4).every((link) => link.strength === "common")).toBe(true);
    expect(entry.families.map((link) => link.family)).toContain("fam:simulation-validation");
    expect(entry.furtherAfield).not.toBeNull();
    const afield = graph.data.families.find((item) => item.id === entry.furtherAfield);
    expect(afield?.domains).not.toContain("dom:engineering");
  });

  it("gives two students with the same major the same starting point", () => {
    const left = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
    const right = atlasEntry(graph, { major: "Mechanical Engineering", majorSource: "catalog" });
    expect(left).toEqual(right);
  });

  it("never defaults an undecided student into engineering", () => {
    const entry = atlasEntry(graph, { major: null, majorSource: "undecided" });
    expect(entry.kind).toBe("open");
    if (entry.kind !== "open") return;
    expect(entry.reason).toBe("undecided");
    expect(entry.domains).toHaveLength(graph.data.domains.length);
    const titles = entry.domains.map((id) => graph.nodes.get(id)?.title ?? "");
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  });

  it("treats a student with no major the same as undecided, without saying they lack anything", () => {
    const entry = atlasEntry(graph, { major: null, majorSource: null });
    expect(entry).toMatchObject({ kind: "open", reason: "unset" });
  });

  it("does not let custom major text reach Atlas", () => {
    const entry = atlasEntry(graph, { major: PRIVATE_TEXT, majorSource: "custom" });
    expect(entry).toMatchObject({ kind: "open", reason: "custom" });
    expect(JSON.stringify(entry)).not.toContain(PRIVATE_TEXT);
  });

  it("treats a legacy free-text major with no source as custom", () => {
    const entry = atlasEntry(graph, { major: PRIVATE_TEXT, majorSource: null });
    expect(entry).toMatchObject({ kind: "open", reason: "custom" });
    expect(JSON.stringify(entry)).not.toContain(PRIVATE_TEXT);
  });

  it("uses the canonical catalog name for a legacy alias", () => {
    const entry = atlasEntry(graph, { major: "mech e", majorSource: null });
    expect(entry).toMatchObject({ kind: "major", label: "Mechanical Engineering" });
  });

  it("falls back to the open entry for a catalog major with no links yet", () => {
    const entry = atlasEntry(graph, { major: "Liberal Studies", majorSource: "catalog" });
    expect(entry).toMatchObject({ kind: "open", reason: "unmapped" });
  });

  it("links majors added in the coverage pass to families that exist", () => {
    for (const major of ["International Business", "Entrepreneurship", "Neuroscience", "Geology", "Environmental Studies", "Cognitive Science", "History", "World Languages", "Public Relations", "Media Studies", "Digital Media"]) {
      const entry = atlasEntry(graph, { major, majorSource: "catalog" });
      expect(entry.kind).toBe("major");
      if (entry.kind === "major") for (const link of entry.families) expect(graph.nodes.get(link.family)?.level).toBe("family");
    }
  });

  it("opens the coverage batch 1 families for majors that had none", () => {
    const expected: Record<string, string> = {
      "Pre-Medicine": "fam:medicine-pharmacy",
      Pharmacy: "fam:medicine-pharmacy",
      "Social Work": "fam:social-services",
      "Special Education": "fam:teaching-advising",
      "Political Science": "fam:social-science",
      "Criminal Justice": "fam:law-justice",
      Kinesiology: "fam:rehab-wellness",
      "Human Resource Management": "fam:human-resources",
      Music: "fam:visual-performing-arts",
    };
    for (const [major, family] of Object.entries(expected)) {
      const entry = atlasEntry(graph, { major, majorSource: "catalog" });
      expect(entry.kind).toBe("major");
      if (entry.kind === "major") expect(entry.families[0]?.family).toBe(family);
    }
  });

  it("keeps the broad interdisciplinary majors on the open entry on purpose", () => {
    for (const major of ["Interdisciplinary Studies", "Liberal Studies"]) {
      expect(atlasEntry(graph, { major, majorSource: "catalog" })).toMatchObject({ kind: "open", reason: "unmapped" });
    }
  });

  it("opens finance for business students and clinical care for nursing students", () => {
    const finance = atlasEntry(graph, { major: "Finance", majorSource: "catalog" });
    const nursing = atlasEntry(graph, { major: "Nursing", majorSource: "catalog" });
    expect(finance.kind === "major" && finance.families[0].family).toBe("fam:finance");
    expect(nursing.kind === "major" && nursing.families[0].family).toBe("fam:clinical-care");
  });
});
