import { describe, expect, it } from "vitest";
import { suggestSchoolFromEmail } from "@/features/profile/school";

describe("suggestSchoolFromEmail", () => {
  it("maps a UC mail domain to University of Cincinnati", () => {
    expect(suggestSchoolFromEmail("student@mail.uc.edu")).toBe("University of Cincinnati");
    expect(suggestSchoolFromEmail("Student@MAIL.UC.EDU")).toBe("University of Cincinnati");
    expect(suggestSchoolFromEmail("student@uc.edu")).toBe("University of Cincinnati");
    expect(suggestSchoolFromEmail("student@ucmail.uc.edu")).toBe("University of Cincinnati");
  });

  it("leaves unknown and non-school domains blank", () => {
    expect(suggestSchoolFromEmail("student@purdue.edu")).toBe("");
    expect(suggestSchoolFromEmail("person@x.edu.evil.com")).toBe("");
    expect(suggestSchoolFromEmail("person@gmail.com")).toBe("");
    expect(suggestSchoolFromEmail("not-an-email")).toBe("");
  });
});
