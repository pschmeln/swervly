import { describe, expect, it } from "vitest";
import { MAJORS } from "@/lib/constants";
import {
  CATALOG,
  matchCatalog,
  normalizeMajorName,
  searchMajors,
  UNDECIDED_LABEL,
  usesEngineeringDirection,
} from "@/features/majors/catalog";

describe("major catalog search", () => {
  it("keeps every legacy major resolvable", () => {
    for (const name of MAJORS) {
      const match = matchCatalog(name);
      expect(match?.name).toBe(name);
    }
  });

  it("does not treat Undecided as a catalog major", () => {
    expect(CATALOG.some((major) => major.name === UNDECIDED_LABEL)).toBe(false);
    expect(matchCatalog(UNDECIDED_LABEL)).toBeNull();
    expect(searchMajors("undecided").some((major) => major.name === UNDECIDED_LABEL)).toBe(false);
  });

  it("hides the legacy Other row from search", () => {
    expect(searchMajors("").some((major) => major.name === "Other")).toBe(false);
    expect(matchCatalog("Other")?.legacy).toBe(true);
  });

  it("finds majors across disciplines and folds aliases", () => {
    expect(searchMajors("nursing").map((major) => major.name)).toContain("Nursing");
    expect(searchMajors("economics").map((major) => major.name)).toContain("Economics");
    expect(searchMajors("psychology").map((major) => major.name)).toContain("Psychology");
    expect(searchMajors("elementary").map((major) => major.name)).toContain("Elementary Education");
    expect(searchMajors("journalism").map((major) => major.name)).toContain("Journalism");

    const cs = searchMajors("CS");
    expect(cs[0]?.name).toBe("Computer Science");
    expect(matchCatalog("Comp Sci")?.name).toBe("Computer Science");
    expect(matchCatalog("comp. sci.")?.name).toBe("Computer Science");
    expect(normalizeMajorName("Industrial & Systems Engineering")).toBe("industrial and systems engineering");
  });

  it("includes an approved extra major in search", () => {
    const found = searchMajors("puppetry", {
      extraMajors: [{ name: "Puppetry", category: "Student-submitted", aliases: [] }],
    });
    expect(found.map((major) => major.name)).toContain("Puppetry");
  });

  it("keeps engineering direction on engineering and computing majors only", () => {
    expect(usesEngineeringDirection("Mechanical Engineering")).toBe(true);
    expect(usesEngineeringDirection("Computer Science")).toBe(true);
    expect(usesEngineeringDirection("Nursing")).toBe(false);
    expect(usesEngineeringDirection("Business Administration")).toBe(false);
    expect(usesEngineeringDirection("Other")).toBe(false);
    expect(usesEngineeringDirection("")).toBe(false);
  });
});
