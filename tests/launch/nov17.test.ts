import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { inviteTarget, referrerForNewUser } from "@/lib/invites";
import { isFounderEmail } from "@/lib/founders";

const self = "11111111-1111-4111-8111-111111111111";
const friend = "22222222-2222-4222-8222-222222222222";

describe("inviteTarget", () => {
  const friendCode = "ab".repeat(16);
  const selfCode = "cd".repeat(16);
  const known = new Map<string, string>([
    [friendCode, friend],
    [selfCode, self],
  ]);

  it("counts a friend's code and ignores self, a user id, and unknown codes", () => {
    expect(inviteTarget(friendCode, self, known)).toBe(friend);
    expect(inviteTarget(selfCode, self, known)).toBeNull();
    expect(inviteTarget(friend, self, known)).toBeNull();
    expect(inviteTarget("not-a-code", self, known)).toBeNull();
    expect(inviteTarget("33333333-3333-4333-8333-333333333333", self, known)).toBeNull();
    expect(referrerForNewUser(self, friend)).toBe(friend);
    expect(referrerForNewUser(self, self)).toBeNull();
    expect(referrerForNewUser(self, null)).toBeNull();
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

describe("release hardening migration", () => {
  const sql = readFileSync("drizzle/0003_release_hardening.sql", "utf8").toLowerCase();

  it("adds share consent without wiping rows or unanswered would-return columns", () => {
    expect(sql).not.toMatch(/\btruncate\b/);
    expect(sql).not.toContain("delete from");
    expect(sql).toContain("share_reviews_consent_at");
    expect(sql).toContain("share_reviews_consent_version");
    expect(sql).not.toMatch(/alter table "rotations"/);
    expect(sql).not.toContain("add column \"would_return");
  });
});
