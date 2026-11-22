import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { getTableColumns } from "drizzle-orm";

vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  return { db: drizzle(async () => ({ rows: [] })) };
});

import { GET as inviteGet } from "@/app/invite/[code]/route";
import PrivacyPage from "@/app/privacy/page";
import { users } from "@/db/schema";
import { POLICY_CHANGES } from "@/features/privacy/agree";
import { PRIVACY_POLICY_UPDATED, PRIVACY_POLICY_VERSION } from "@/features/privacy/policy-version";
import { PointsBalance } from "@/features/profile/components/points-balance";
import { InviteLink } from "@/features/profile/components/invite-link";
import { POINTS_COMING_SOON, friendsFinishedLabel, pointsBalanceLabel } from "@/features/profile/referral-copy";
import {
  REFERRAL_ONBOARDED_REASON,
  REFERRAL_POINTS,
  REFERRAL_SLOT_CAP,
  finishedOnboardingsQuery,
  lowestFreeSlot,
  pointsBalanceQuery,
  pointsLedgerExportQuery,
  referralOnboardingAward,
} from "@/features/profile/referrals";
import { INVITE_COOKIE, createReferralCode, isLegacyInviteUserId, normalizeReferralCode } from "@/lib/invites";
import { ROUTES } from "@/lib/constants";

const caller = "00000000-0000-4000-8000-000000000001";

function visibleText(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&apos;/g, "'").replace(/\s+/g, " ").trim();
}

describe("referral codes", () => {
  it("creates a url-safe code and rejects a user id", () => {
    const first = createReferralCode();
    const second = createReferralCode();
    expect(first).toMatch(/^[0-9a-f]{32}$/);
    expect(second).toMatch(/^[0-9a-f]{32}$/);
    expect(first).not.toBe(second);
    expect(normalizeReferralCode(first.toUpperCase())).toBe(first);
    expect(normalizeReferralCode(caller)).toBeNull();
    expect(isLegacyInviteUserId(caller)).toBe(true);
    expect(isLegacyInviteUserId(first)).toBe(false);
  });
});

describe("lowest free slot", () => {
  it("picks the lowest free slot and stops at 10", () => {
    expect(lowestFreeSlot([])).toBe(1);
    expect(lowestFreeSlot([1, 2])).toBe(3);
    expect(lowestFreeSlot([1, 3])).toBe(2);
    expect(lowestFreeSlot([1, 1, 2])).toBe(3);
    expect(lowestFreeSlot([10])).toBe(1);
    expect(lowestFreeSlot([0, 11, 1.5])).toBe(1);
    expect(lowestFreeSlot([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(10);
    expect(lowestFreeSlot([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBeNull();
    expect(REFERRAL_SLOT_CAP).toBe(10);
    expect(REFERRAL_POINTS).toBe(100);
  });
});

describe("award SQL", () => {
  const query = referralOnboardingAward(caller).toSQL();

  it("awards 100 points for the first onboarding only, in the same batch, before onboarded_at is set", () => {
    expect(query.sql.toLowerCase()).toContain("on conflict do nothing");
    expect(query.sql).toContain('"onboarded_at" is null');
    expect(query.sql).toContain('"consent_privacy_at" is not null');
    expect(query.sql).toContain('"consent_data_use_at" is not null');
    expect(query.params).toContain(caller);
    expect(query.params).toContain(REFERRAL_POINTS);
    expect(query.params).toContain(REFERRAL_ONBOARDED_REASON);
    const server = readFileSync(path.join(process.cwd(), "src/features/profile/server.ts"), "utf8");
    const awardAt = server.indexOf("referralOnboardingAward(userId)");
    const onboardAt = server.indexOf("onboardedAt: sql`now()`");
    expect(awardAt).toBeGreaterThan(-1);
    expect(onboardAt).toBeGreaterThan(awardAt);
    expect(server).toContain("db.batch");
  });

  it("does not award a self-referral", () => {
    expect(query.sql).toContain('"invited_by_user_id" is not null');
    expect(query.sql).toContain('"users"."invited_by_user_id" <> "users"."id"');
  });

  it("picks the lowest free slot from 1 to 10 and inserts nothing when every slot is taken", () => {
    expect(query.sql).toContain("generate_series(1,");
    expect(query.sql).toContain("order by gs.slot");
    expect(query.sql).toContain("limit 1");
    expect(query.sql).toContain("not exists");
    expect(query.sql.toLowerCase()).toContain("is not null");
    expect(query.params).toContain(REFERRAL_SLOT_CAP);
    expect(query.sql).toContain('"points_ledger"');
  });

  it("inserts one row per friend and lets the unique constraint skip a duplicate", () => {
    expect(query.sql).toContain('"referred_user_id"');
    expect(query.sql).toContain('"users"."id"');
    expect(query.sql.toLowerCase()).toContain("on conflict do nothing");
  });
});

describe("counts and export", () => {
  it("counts finished onboardings, not sign-ups", () => {
    const query = finishedOnboardingsQuery(caller).toSQL();
    expect(query.sql).toContain('"invited_by_user_id" = $1');
    expect(query.sql).toContain('"onboarded_at" is not null');
    expect(query.params).toEqual([caller]);
  });

  it("sums only this student's points", () => {
    const query = pointsBalanceQuery(caller).toSQL();
    expect(query.sql).toContain("coalesce(sum(");
    expect(query.sql).toContain('"points_ledger"."user_id" = $1');
    expect(query.params).toEqual([caller]);
    expect(query.sql).not.toContain("email");
  });

  it("exports the caller's ledger and the referral code column on the user row", () => {
    const query = pointsLedgerExportQuery(caller).toSQL();
    expect(query.sql).toContain('from "points_ledger"');
    expect(query.sql).toContain('"points_ledger"."user_id" = $1');
    expect(query.params).toEqual([caller]);
    expect(query.sql).not.toContain("email");
    expect(getTableColumns(users).referralCode.name).toBe("referral_code");
    expect(getTableColumns(users).referralCode.notNull).toBe(true);
    const server = readFileSync(path.join(process.cwd(), "src/features/profile/server.ts"), "utf8");
    expect(server).toContain("pointsLedgerExportQuery(userId)");
    expect(server).toContain("points: pointRows");
    const settings = readFileSync(path.join(process.cwd(), "src/app/(app)/settings/page.tsx"), "utf8");
    expect(settings).toContain("user.referralCode");
    expect(settings).not.toContain("/invite/${user.id}");
    expect(settings).toContain("summary.finishedOnboardings");
  });
});

describe("old invite route", () => {
  it("redirects a user id to / and sets no cookie", async () => {
    const response = await inviteGet(new Request(`https://app.swervly.com/invite/${caller}`), {
      params: Promise.resolve({ code: caller }),
    });
    expect(response.headers.get("location")).toBe("https://app.swervly.com/");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sets the referral code cookie, never a user id, and sends a real code to sign-up", async () => {
    const code = "ab".repeat(16);
    const response = await inviteGet(new Request(`https://app.swervly.com/invite/${code.toUpperCase()}`), {
      params: Promise.resolve({ code: code.toUpperCase() }),
    });
    expect(response.headers.get("location")).toBe(`https://app.swervly.com${ROUTES.signUp}`);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toContain(`${INVITE_COOKIE}=${code}`);
    expect(cookie.toLowerCase()).toContain("httponly");
    expect(cookie).toContain("Max-Age=2592000");
    expect(cookie).not.toContain(caller);
  });

  it("does not set a cookie for junk", async () => {
    const response = await inviteGet(new Request("https://app.swervly.com/invite/nope"), {
      params: Promise.resolve({ code: "nope" }),
    });
    expect(response.headers.get("location")).toBe(`https://app.swervly.com${ROUTES.signUp}`);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("referral copy", () => {
  it("shows the balance and a nameless count, and says points are not spendable yet", () => {
    expect(friendsFinishedLabel(3)).toBe("3 friends finished onboarding");
    expect(friendsFinishedLabel(1)).toBe("1 friend finished onboarding");
    expect(friendsFinishedLabel(0)).toBe("0 friends finished onboarding");
    expect(pointsBalanceLabel(300)).toBe("300 points");
    expect(pointsBalanceLabel(1)).toBe("1 point");
    expect(POINTS_COMING_SOON).toBe("Points can be spent on things coming soon.");

    const html = renderToStaticMarkup(
      <InviteLink href="https://app.swervly.com/invite/abababababababababababababababab" finishedCount={3} points={300} />,
    );
    const text = visibleText(html);
    expect(text).toContain("3 friends finished onboarding");
    expect(text).toContain("300 points");
    expect(text).toContain(POINTS_COMING_SOON);
    expect(text).toContain("/invite/abababababababababababababababab");
    expect(text).not.toContain("@");
    expect(text).not.toContain(caller);
    expect(html).toContain("Copy invite link");

    const balance = visibleText(renderToStaticMarkup(<PointsBalance points={0} />));
    expect(balance).toContain("0 points");
    expect(balance).toContain(POINTS_COMING_SOON);
  });

  it("tells the privacy policy about invite codes and points, from version 3", () => {
    expect(PRIVACY_POLICY_VERSION).toBeGreaterThanOrEqual(3);
    expect(PRIVACY_POLICY_UPDATED).toBe("November 22, 2026");
    expect(POLICY_CHANGES[3]?.join(" ")).toContain("100 points");
    expect(POLICY_CHANGES[3]?.join(" ")).toContain(POINTS_COMING_SOON);
    const text = visibleText(renderToStaticMarkup(<PrivacyPage />));
    expect(text).toContain("we store who invited you");
    expect(text).toContain("invite code");
    expect(text).toContain("100 points");
    expect(text).toContain("up to 10");
    expect(text).toContain(POINTS_COMING_SOON);
    expect(text).toContain("Other students do not see your points");
    expect(text).toContain("your invite code, and your points");
    expect(text).toContain("points you already earned stay");
    expect(text).toContain("no longer linked to them");
    expect(text).toContain("November 22, 2026");
  });
});

describe("migration 0012", () => {
  const sql = readFileSync(path.join(process.cwd(), "drizzle/0012_referrals_points.sql"), "utf8");
  const journal = JSON.parse(readFileSync(path.join(process.cwd(), "drizzle/meta/_journal.json"), "utf8")) as {
    entries: { idx: number; when: number; tag: string }[];
  };

  it("backfills codes, caps awards at 10, and keeps a deleted friend's points", () => {
    expect(sql).not.toMatch(/\btruncate\b/i);
    expect(sql.toLowerCase()).not.toContain("delete from");
    expect(sql).toContain('ADD COLUMN "referral_code" text');
    expect(sql).toContain('md5("id"::text || gen_random_uuid()::text)');
    expect(sql).toContain('SET NOT NULL');
    expect(sql).toContain('"users_referral_code_unique" UNIQUE("referral_code")');
    expect(sql).toContain('CREATE TABLE "points_ledger"');
    expect(sql).toContain(`'referral_onboarded'`);
    expect(sql).toContain('"slot" between 1 and 10');
    expect(sql).toContain('UNIQUE("user_id","reason","slot")');
    expect(sql).toContain('UNIQUE("reason","referred_user_id")');
    expect(sql.toLowerCase()).toContain('foreign key ("user_id") references "public"."users"("id") on delete cascade');
    expect(sql.toLowerCase()).toContain('foreign key ("referred_user_id") references "public"."users"("id") on delete set null');
    expect(sql).not.toContain("referral_invites");
    const entry = journal.entries.find((item) => item.tag === "0012_referrals_points");
    expect(entry).toEqual({ idx: 12, version: "7", when: 1796000000000, tag: "0012_referrals_points", breakpoints: true });
    expect(journal.entries.find((item) => item.tag === "0011_community")?.when).toBe(1795900000000);
  });
});
