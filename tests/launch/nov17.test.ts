import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inviteTarget } from "@/lib/invites";
import { isFounderEmail } from "@/lib/founders";

const self = "11111111-1111-4111-8111-111111111111";
const friend = "22222222-2222-4222-8222-222222222222";

describe("inviteTarget", () => {
  const known = new Set([self, friend]);

  it("counts a friend and ignores self, junk, and unknown ids", () => {
    expect(inviteTarget(friend, self, known)).toBe(friend);
    expect(inviteTarget(self, self, known)).toBeNull();
    expect(inviteTarget("not-a-uuid", self, known)).toBeNull();
    expect(inviteTarget("33333333-3333-4333-8333-333333333333", self, known)).toBeNull();
  });
});

describe("isFounderEmail", () => {
  it("matches the env list and nobody when it is empty", () => {
    expect(isFounderEmail("founder@school.edu", "founder@school.edu, other@school.edu")).toBe(true);
    expect(isFounderEmail("student@school.edu", "founder@school.edu")).toBe(false);
    expect(isFounderEmail("founder@school.edu", "")).toBe(false);
  });
});

describe("nov 17 migration", () => {
  const sql = readFileSync("drizzle/0002_nov17_features.sql", "utf8").toLowerCase();

  it("replaces return_offer after would_return exists and does not wipe rows", () => {
    expect(sql).not.toMatch(/\btruncate\b/);
    expect(sql).not.toContain("delete from");
    const would = sql.indexOf("would_return");
    const drop = sql.indexOf('drop column "return_offer"');
    expect(would).toBeGreaterThan(-1);
    expect(drop).toBeGreaterThan(would);
    expect(sql).toContain("vector(20)");
    expect(sql).toContain("invited_by_user_id");
    expect(sql).toContain("create table \"skills\"");
    expect(sql).toContain("create table \"feedback\"");
  });
});
