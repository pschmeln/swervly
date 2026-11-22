import { readFileSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPage from "@/app/privacy/page";
import { POLICY_CHANGES, PolicyAgreeInput } from "@/features/privacy/agree";
import { needsPolicyAgreement, PRIVACY_POLICY_VERSION } from "@/features/privacy/policy-version";

describe("privacy policy version 2", () => {
  it("asks people who agreed to an older version, and nobody else", () => {
    const at = new Date();
    expect(needsPolicyAgreement({ consentPrivacyAt: at, privacyPolicyVersion: 1 })).toBe(true);
    expect(needsPolicyAgreement({ consentPrivacyAt: at, privacyPolicyVersion: null })).toBe(true);
    expect(needsPolicyAgreement({ consentPrivacyAt: at, privacyPolicyVersion: PRIVACY_POLICY_VERSION })).toBe(false);
    expect(needsPolicyAgreement({ consentPrivacyAt: null, privacyPolicyVersion: null })).toBe(false);
  });

  it("only accepts agreement to the version on screen", () => {
    expect(PolicyAgreeInput.safeParse({ version: PRIVACY_POLICY_VERSION }).success).toBe(true);
    expect(PolicyAgreeInput.safeParse({ version: PRIVACY_POLICY_VERSION - 1 }).success).toBe(false);
    expect(POLICY_CHANGES[PRIVACY_POLICY_VERSION]?.length).toBeGreaterThan(0);
  });

  it("says what location data is collected and who sees it", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(html).toContain("home city");
    expect(html).toContain("open to remote work");
    expect(html).toContain("city where you worked");
    expect(html).toContain("not shown");
    expect(html).toContain("headquartered within your chosen");
    expect(html).toContain("agree");
  });

  it("gates the app layout and records the version on every profile save", () => {
    const layout = readFileSync(path.join(process.cwd(), "src/app/(app)/layout.tsx"), "utf8");
    expect(layout).toContain("needsPolicyAgreement(user)");
    const server = readFileSync(path.join(process.cwd(), "src/features/profile/server.ts"), "utf8");
    expect(server).toContain("${privacyPolicySql()}");
    expect(server).not.toContain("consent_privacy_at = coalesce");
  });

  it("migration 0009 backfills location and the policy version", () => {
    const sql = readFileSync(path.join(process.cwd(), "drizzle/0009_location_policy.sql"), "utf8");
    expect(sql).toContain(`WHEN 'cincinnati_only' THEN 25 ELSE 250`);
    expect(sql).toContain(`"open_to_anywhere" = true WHERE "location_constraint" = 'anywhere'`);
    expect(sql).toContain(`"privacy_policy_version" = 1 WHERE "consent_privacy_at" IS NOT NULL`);
    expect(sql).toContain(`'3915000'`);
    expect(sql).not.toMatch(/DROP COLUMN|DROP TABLE/);
  });
});
