import { describe, expect, it } from "vitest";
import { OCCUPATIONS } from "@/content/atlas/occupations";
import { ATLAS_DATA } from "@/features/atlas/graph";
import type { AtlasData } from "@/features/atlas/types";
import { validateAtlas } from "@/features/atlas/validate";

function withChange(change: (data: AtlasData) => AtlasData): string[] {
  return validateAtlas(change(ATLAS_DATA));
}

describe("Career Atlas data", () => {
  it("passes every structural check", () => {
    expect(validateAtlas(ATLAS_DATA)).toEqual([]);
  });

  it("keeps occupation ids stable: id is always occ:onet:<code>", () => {
    for (const item of OCCUPATIONS) expect(item.id).toBe(`occ:onet:${item.onetCode}`);
  });

  it("covers several academic fields, not only engineering", () => {
    const prefixes = new Set(OCCUPATIONS.map((item) => item.onetCode.slice(0, 2)));
    for (const group of ["11", "13", "15", "17", "19", "25", "29"]) expect(prefixes.has(group)).toBe(true);
  });

  it("rejects a duplicate id", () => {
    const errors = withChange((data) => ({ ...data, domains: [...data.domains, data.domains[0]] }));
    expect(errors.some((error) => error.includes("duplicate id"))).toBe(true);
  });

  it("rejects an edge to a node that does not exist", () => {
    const errors = withChange((data) => ({
      ...data,
      families: data.families.map((item, index) => (index === 0 ? { ...item, domains: ["dom:nowhere"] } : item)),
    }));
    expect(errors.some((error) => error.includes("dom:nowhere"))).toBe(true);
  });

  it("rejects an upward edge, which is how a cycle would start", () => {
    const errors = withChange((data) => ({
      ...data,
      specializations: data.specializations.map((item, index) =>
        index === 0 ? { ...item, families: ["spec:robotics-software" as never] } : item,
      ),
    }));
    expect(errors.some((error) => error.includes("not a family"))).toBe(true);
  });

  it("rejects an orphan occupation", () => {
    const errors = withChange((data) => ({
      ...data,
      occupations: [...data.occupations, { id: "occ:onet:99-9999.00", onetCode: "99-9999.00", title: "Orphan", provenance: "onet" }],
    }));
    expect(errors.some((error) => error.includes("not reachable"))).toBe(true);
  });

  it("rejects a specialization with no sourced occupation", () => {
    const errors = withChange((data) => ({
      ...data,
      specializations: data.specializations.map((item, index) => (index === 0 ? { ...item, occupations: [] } : item)),
    }));
    expect(errors.some((error) => error.includes("no sourced occupation"))).toBe(true);
  });

  it("rejects a major link for a major that is not in the catalog", () => {
    const errors = withChange((data) => ({ ...data, majorLinks: { ...data.majorLinks, "Underwater Basketry": [] } }));
    expect(errors.some((error) => error.includes("Underwater Basketry"))).toBe(true);
  });

  it("rejects an editorial label on an occupation", () => {
    const errors = withChange((data) => ({
      ...data,
      occupations: data.occupations.map((item, index) => (index === 0 ? { ...item, provenance: "swervly_editorial" as never } : item)),
    }));
    expect(errors.some((error) => error.includes("must be sourced"))).toBe(true);
  });
});
