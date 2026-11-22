import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { COMPANY_FAMILIES } from "@/content/atlas/company-links";
import { COMPANIES } from "@/content/companies";
import { CompaniesDirectory, SHOW_ALL } from "@/features/community/components/companies-directory";
import { companiesForDirection, type DirectoryCompany } from "@/features/community/directory-filter";
import { directionFamilies } from "@/features/community/directory";
import { chosenDirectionView } from "@/features/direction/chosen";
import type { FamilyId } from "@/features/atlas/types";

function card(id: string, families: FamilyId[]): DirectoryCompany {
  return {
    id,
    name: `Company ${id}`,
    field: "Engineering",
    roleCategories: ["Design"],
    whyShown: "Listed under an area of the career map.",
    careersUrl: null,
    linkCheckedOn: null,
    families,
  };
}

describe("Community companies (items 12, 13, 8)", () => {
  it("finds the career map families of a chosen occupation or specialization", () => {
    expect(directionFamilies(null)).toEqual([]);
    expect(directionFamilies(chosenDirectionView("spec:test-validation"))).toEqual(["fam:simulation-validation"]);
    const mech = directionFamilies(chosenDirectionView("occ:onet:17-2141.00"));
    expect(mech).toContain("fam:design-development");
    expect(mech).toContain("fam:simulation-validation");
  });

  it("filters to the direction's families, and shows everything without a direction", () => {
    const companies = [card("a", ["fam:finance"]), card("b", ["fam:design-development"]), card("c", [])];
    expect(companiesForDirection(companies, ["fam:design-development"]).map((item) => item.id)).toEqual(["b"]);
    expect(companiesForDirection(companies, []).map((item) => item.id)).toEqual(["a", "b", "c"]);
  });

  it("starts filtered to the direction with Show all one tap away", () => {
    const companies = [card("a", ["fam:finance"]), card("b", ["fam:design-development"])];
    const html = renderToStaticMarkup(
      <CompaniesDirectory companies={companies} companyRoles={["Design"]} directionTitle="Mechanical Engineers" directionFamilies={["fam:design-development"]} />,
    );
    expect(html).toContain("Showing 1 companies for your direction: Mechanical Engineers.");
    expect(html).toContain(SHOW_ALL);
    expect(html).toContain("Company b");
    expect(html).not.toContain("Company a");
    const all = renderToStaticMarkup(<CompaniesDirectory companies={companies} companyRoles={[]} directionTitle={null} directionFamilies={[]} />);
    expect(all).toContain("Company a");
    expect(all).not.toContain(SHOW_ALL);
  });

  it("lists every directory company under at least one real family", () => {
    const withFamilies = COMPANIES.filter((company) => (COMPANY_FAMILIES[company.id] ?? []).length > 0);
    expect(withFamilies.length).toBeGreaterThan(200);
  });
});
