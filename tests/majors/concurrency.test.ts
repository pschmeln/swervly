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

  it("saves a custom major and the profile in one statement, and rejects a second pending row", () => {
    expect(profile).toContain("and exists (select 1 from renamed)");
    expect(profile).toContain("on conflict (user_id) where status = 'pending' do nothing");
    expect(profile).toContain("insert into profiles");
    expect(profile).toContain("from changed");
    expect(profile).toContain("if (returnedIds(saved).length === 0) throw conflict()");
  });
});
