import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  hasOutdatedShareReviewsConsent,
  hasShareReviewsConsent,
  SHARE_REVIEWS_CONSENT_LABEL,
  SHARE_REVIEWS_CONSENT_VERSION,
} from "@/features/privacy/share-consent";
import { shareReviewsConsentSql } from "@/features/profile/server";

const at = new Date("2026-11-17T12:00:00Z");

describe("review sharing consent version 2 (2-student minimum)", () => {
  it("is version 2 and states the 2-student rule", () => {
    expect(SHARE_REVIEWS_CONSENT_VERSION).toBe(2);
    expect(SHARE_REVIEWS_CONSENT_LABEL).toContain("at least 2 different students");
    expect(SHARE_REVIEWS_CONSENT_LABEL).toContain("Pay ranges need 2 different students");
  });

  it("stops counting consent given to the 3-student terms", () => {
    const old = { shareReviewsConsentAt: at, shareReviewsConsentVersion: 1 };
    expect(hasShareReviewsConsent(old)).toBe(false);
    expect(hasOutdatedShareReviewsConsent(old)).toBe(true);
  });

  it("counts consent to the current terms and does not flag it", () => {
    const current = { shareReviewsConsentAt: at, shareReviewsConsentVersion: 2 };
    expect(hasShareReviewsConsent(current)).toBe(true);
    expect(hasOutdatedShareReviewsConsent(current)).toBe(false);
  });

  it("does not flag a student who never consented", () => {
    const none = { shareReviewsConsentAt: null, shareReviewsConsentVersion: null };
    expect(hasShareReviewsConsent(none)).toBe(false);
    expect(hasOutdatedShareReviewsConsent(none)).toBe(false);
  });
});

describe("shareReviewsConsentSql", () => {
  const dialect = new PgDialect();

  it("adds nothing when the student is not consenting", () => {
    expect(dialect.sqlToQuery(shareReviewsConsentSql(false)).sql).toBe("");
  });

  it("always writes the current version, so re-consent to new terms takes effect", () => {
    const query = dialect.sqlToQuery(shareReviewsConsentSql(true));
    // The old code used coalesce(share_reviews_consent_version, ...), which kept version 1 forever.
    expect(query.sql).not.toMatch(/share_reviews_consent_version = coalesce/);
    expect(query.sql).toMatch(/share_reviews_consent_version = \$\d+$/);
    expect(query.params).toEqual([SHARE_REVIEWS_CONSENT_VERSION, SHARE_REVIEWS_CONSENT_VERSION]);
    expect(query.sql).toContain("case when share_reviews_consent_version =");
  });
});
