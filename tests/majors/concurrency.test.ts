import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("major moderation and profile saves", () => {
  const moderation = readFileSync("src/features/majors/moderate.ts", "utf8");
  const profile = readFileSync("src/features/profile/server.ts", "utf8");

  it("claims a submission only while it is still the pending name the founder reviewed", () => {
    expect(moderation).toContain("and status = 'pending'");
    expect(moderation).toContain("and normalized_name = ");
    expect(moderation).toContain("and users.major_submission_id = decided.id");
  });

  it("does not let a stale custom save overwrite a submission that is no longer pending", () => {
    expect(profile).toContain("and ${majorSubmissions.status} = 'pending'");
  });
});
