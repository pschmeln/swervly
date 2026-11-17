import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "@/lib/auth";

describe("isAllowedEmail", () => {
  it("allows any domain whose last label is edu", () => {
    expect(isAllowedEmail("student@mail.uc.edu")).toBe(true);
    expect(isAllowedEmail("Student@Purdue.EDU")).toBe(true);
    expect(isAllowedEmail("a@cs.purdue.edu")).toBe(true);
    expect(isAllowedEmail("  student@school.edu  ")).toBe(true);
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
    expect(isAllowedEmail("x@osu.edu")).toBe(true);
    expect(isAllowedEmail("x@mail.uc.edu")).toBe(true);
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
});
