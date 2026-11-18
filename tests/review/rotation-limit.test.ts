import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_ROTATIONS } from "@/lib/constants";

describe("co-op limit", () => {
  it("is 8", () => {
    expect(MAX_ROTATIONS).toBe(8);
  });

  it("matches the database check in the schema", () => {
    const schema = readFileSync("src/db/schema.ts", "utf8");
    expect(schema).toContain(`check("rotations_number_range", sql`);
    expect(schema).toContain(`rotationNumber} between 1 and ${MAX_ROTATIONS}`);
  });

  it("is applied by a migration that only widens the check", () => {
    const migration = readFileSync("drizzle/0005_rotation_number_max_8.sql", "utf8");
    expect(migration).toContain(`CHECK ("rotations"."rotation_number" between 1 and ${MAX_ROTATIONS})`);
    expect(migration).not.toMatch(/\b(DELETE|UPDATE|TRUNCATE|DROP TABLE|DROP COLUMN)\b/i);
    const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8")) as {
      entries: { tag: string }[];
    };
    expect(journal.entries.at(-1)?.tag).toBe("0005_rotation_number_max_8");
  });
});
