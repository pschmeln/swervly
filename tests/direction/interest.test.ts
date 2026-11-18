import { describe, expect, it } from "vitest";
import { interestedFirst } from "@/features/direction/career-roles";
import { MAX_INTERESTED_ROLES, nextInterestLists } from "@/features/direction/interest";

const empty = { interestedCareerRoles: [] as string[], dismissedCareerRoles: [] as string[] };

describe("nextInterestLists", () => {
  it("adds once and keeps the order of marking", () => {
    const one = nextInterestLists(empty, "design", true);
    const two = nextInterestLists(one, "software", true);
    expect(nextInterestLists(two, "design", true).interestedCareerRoles).toEqual(["design", "software"]);
  });

  it("removes on unmark and leaves dismissed alone", () => {
    const next = nextInterestLists({ interestedCareerRoles: ["design"], dismissedCareerRoles: ["research"] }, "design", false);
    expect(next).toEqual({ interestedCareerRoles: [], dismissedCareerRoles: ["research"] });
  });

  it("brings back a dismissed career when it is marked", () => {
    expect(nextInterestLists({ interestedCareerRoles: [], dismissedCareerRoles: ["design"] }, "design", true)).toEqual({
      interestedCareerRoles: ["design"],
      dismissedCareerRoles: [],
    });
  });

  it("stops growing at the cap", () => {
    const full = { interestedCareerRoles: Array.from({ length: MAX_INTERESTED_ROLES }, (_, i) => `r${i}`), dismissedCareerRoles: [] };
    expect(nextInterestLists(full, "design", true).interestedCareerRoles).toHaveLength(MAX_INTERESTED_ROLES);
  });
});

describe("interestedFirst", () => {
  const items = ["design", "software", "research"].map((roleType) => ({ roleType }));

  it("moves Interested careers to the top and keeps the rest in order", () => {
    expect(interestedFirst(items, ["research"]).map((item) => item.roleType)).toEqual(["research", "design", "software"]);
  });

  it("changes nothing when nothing is marked", () => {
    expect(interestedFirst(items, []).map((item) => item.roleType)).toEqual(["design", "software", "research"]);
  });
});
