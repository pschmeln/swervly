import { describe, expect, it } from "vitest";

import { EMPLOYERS_SEED } from "@/content/employers-seed";
import { normalizeEmployerName } from "@/features/review/normalize";

describe("EMPLOYERS_SEED Siemens entry", () => {
  const siemens = EMPLOYERS_SEED.find(
    (row) => row.name === "Siemens Digital Industries Software",
  );

  it("uses the canonical Siemens Digital Industries Software name", () => {
    expect(siemens).toBeDefined();
    expect(
      EMPLOYERS_SEED.some((row) => row.name === "Siemens PLM Software"),
    ).toBe(false);
  });

  it("keeps legacy Siemens PLM names as aliases", () => {
    expect(siemens?.aliases).toEqual(
      expect.arrayContaining(["Siemens PLM Software", "Siemens PLM"]),
    );
  });

  it("does not collide with other seed normalized names", () => {
    expect(siemens).toBeDefined();
    if (!siemens) return;

    const otherKeys = new Set(
      EMPLOYERS_SEED.filter((row) => row !== siemens).map((row) =>
        normalizeEmployerName(row.name),
      ),
    );

    expect(otherKeys.has(normalizeEmployerName(siemens.name))).toBe(false);
    for (const alias of siemens.aliases) {
      expect(otherKeys.has(normalizeEmployerName(alias))).toBe(false);
    }
  });
});
