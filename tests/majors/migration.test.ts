import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAJORS } from "@/lib/constants";

describe("major catalog migration", () => {
  const sql = readFileSync("drizzle/0004_major_catalog.sql", "utf8");
  const lowered = sql.toLowerCase();

  it("adds major state without deleting rows or dropping the major column", () => {
    expect(lowered).not.toMatch(/\btruncate\b/);
    expect(lowered).not.toContain("delete from");
    expect(lowered).not.toContain('drop column "major"');
    expect(lowered).toContain('add column "major_source"');
    expect(lowered).toContain('add column "custom_major_text"');
    expect(lowered).toContain('add column "exploring_majors" boolean default false not null');
    expect(lowered).toContain('create table "major_submissions"');
    expect(lowered).toContain('create table "major_catalog"');
    expect(lowered).toContain('create table "major_aliases"');
    for (const major of MAJORS) {
      expect(sql).toContain(`'${major}'`);
    }
    const copyAt = lowered.indexOf('"custom_major_text" = "major"');
    const clearAt = lowered.indexOf('"major" = null');
    expect(copyAt).toBeGreaterThan(-1);
    expect(clearAt).toBeGreaterThan(copyAt);
  });
});
