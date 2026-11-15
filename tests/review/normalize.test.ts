import { describe, expect, it } from "vitest";

import { EMPLOYERS_SEED } from "@/content/employers-seed";
import { normalizeEmployerName } from "@/features/review/normalize";

describe("normalizeEmployerName", () => {
  it('normalizes "GE Aerospace, Inc." and "ge aerospace" to the same string', () => {
    expect(normalizeEmployerName("GE Aerospace, Inc.")).toBe(
      normalizeEmployerName("ge aerospace"),
    );
    expect(normalizeEmployerName("GE Aerospace, Inc.")).toBe("ge aerospace");
  });

  it('normalizes "AT&T" and "AT and T" to the same string', () => {
    expect(normalizeEmployerName("AT&T")).toBe(normalizeEmployerName("AT and T"));
    expect(normalizeEmployerName("AT&T")).toBe("at and t");
  });

  it("produces unique normalized names across EMPLOYERS_SEED entries and aliases", () => {
    const nameKeys = new Map<string, string>();

    for (const employer of EMPLOYERS_SEED) {
      const key = normalizeEmployerName(employer.name);
      expect(key.length).toBeGreaterThan(0);
      expect(nameKeys.has(key)).toBe(false);
      nameKeys.set(key, employer.name);
    }

    for (const employer of EMPLOYERS_SEED) {
      const ownKey = normalizeEmployerName(employer.name);
      for (const alias of employer.aliases) {
        const aliasKey = normalizeEmployerName(alias);
        if (aliasKey === ownKey) continue;
        expect(nameKeys.has(aliasKey)).toBe(false);
      }
    }
  });
});
