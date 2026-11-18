import { describe, expect, it } from "vitest";
import {
  eligibilityErrorForEmail,
  ELIGIBILITY_ERROR_MESSAGE,
  isAllowedEmail,
} from "@/lib/email-eligibility";
import { isAllowedEmail as isAllowedEmailFromAuth } from "@/lib/auth";

describe("isAllowedEmail", () => {
  it("allows any domain whose last label is edu", () => {
    expect(isAllowedEmail("student@mail.uc.edu")).toBe(true);
    expect(isAllowedEmail("Student@Purdue.EDU")).toBe(true);
    expect(isAllowedEmail("a@cs.purdue.edu")).toBe(true);
    expect(isAllowedEmail("  student@school.edu  ")).toBe(true);
    expect(isAllowedEmail("student@uc.edu")).toBe(true);
    expect(isAllowedEmail("student@osu.edu")).toBe(true);
  });

  it("keeps ALLOWED_EMAIL_DOMAINS as an exact extra allowlist", () => {
    expect(isAllowedEmail("person@partner.org", ["partner.org"])).toBe(true);
    expect(isAllowedEmail("person@Partner.ORG", ["partner.org"])).toBe(true);
    expect(isAllowedEmail("person@sub.partner.org", ["partner.org"])).toBe(false);
    expect(isAllowedEmail("person@partner.org.evil.com", ["partner.org"])).toBe(false);
    expect(isAllowedEmail("person@notpartner.org", ["partner.org"])).toBe(false);
  });

  it("rejects domains that only contain .edu as a substring", () => {
    expect(isAllowedEmail("person@x.edu.evil.com")).toBe(false);
    expect(isAllowedEmail("person@mail.uc.edu.evil.com")).toBe(false);
    expect(isAllowedEmail("person@notedu.com")).toBe(false);
    expect(isAllowedEmail("person@school.education")).toBe(false);
    expect(isAllowedEmail("person@edu.com")).toBe(false);
    expect(isAllowedEmail("x@gmail.com")).toBe(false);
    expect(isAllowedEmail("x@edu.example.com")).toBe(false);
    expect(isAllowedEmail("student@university.edu.evil.com")).toBe(false);
  });

  it("rejects a bare edu label and broken addresses", () => {
    expect(isAllowedEmail("person@edu")).toBe(false);
    expect(isAllowedEmail("person@.edu")).toBe(false);
    expect(isAllowedEmail("person@foo..edu")).toBe(false);
    expect(isAllowedEmail("person@foo.edu.")).toBe(false);
    expect(isAllowedEmail("@purdue.edu")).toBe(false);
    expect(isAllowedEmail("purdue.edu")).toBe(false);
    expect(isAllowedEmail("a@b@purdue.edu")).toBe(false);
    expect(isAllowedEmail("")).toBe(false);
  });

  it("re-exports the same helper from auth", () => {
    expect(isAllowedEmailFromAuth("student@mail.uc.edu")).toBe(true);
    expect(isAllowedEmailFromAuth("student@gmail.com")).toBe(false);
  });
});

describe("eligibilityErrorForEmail", () => {
  it("returns the university .edu message for ineligible domains", () => {
    expect(eligibilityErrorForEmail("student@gmail.com")).toBe(ELIGIBILITY_ERROR_MESSAGE);
    expect(eligibilityErrorForEmail("student@edu.example.com")).toBe(ELIGIBILITY_ERROR_MESSAGE);
    expect(eligibilityErrorForEmail("student@university.edu.evil.com")).toBe(
      ELIGIBILITY_ERROR_MESSAGE,
    );
  });

  it("accepts the Phase 1 example addresses", () => {
    expect(eligibilityErrorForEmail("student@uc.edu")).toBeNull();
    expect(eligibilityErrorForEmail("student@mail.uc.edu")).toBeNull();
    expect(eligibilityErrorForEmail("student@osu.edu")).toBeNull();
  });
});
