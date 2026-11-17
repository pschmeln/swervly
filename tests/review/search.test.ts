import { describe, expect, it } from "vitest";
import { EMPLOYERS_SEED } from "@/content/employers-seed";
import { rankEmployers, type EmployerCandidate } from "@/features/review/search";

const candidates: EmployerCandidate[] = EMPLOYERS_SEED.map((employer, index) => ({
  id: String(index),
  name: employer.name,
  city: employer.city,
  aliases: employer.aliases,
}));

function topNames(query: string): string[] {
  return rankEmployers(query, candidates).slice(0, 3).map((employer) => employer.name);
}

describe("rankEmployers", () => {
  it("suggests GE Aerospace for nicknames, word starts, and short prefixes", () => {
    expect(topNames("ge")).toContain("GE Aerospace");
    expect(topNames("general elec")).toContain("GE Aerospace");
    expect(topNames("GE Aero")).toContain("GE Aerospace");
  });

  it("allows a small typo", () => {
    expect(topNames("honde")).toContain("Honda");
  });
});
