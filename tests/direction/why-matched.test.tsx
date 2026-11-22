import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPage from "@/app/privacy/page";
import { PrioritiesInput, readPriorities } from "@/features/direction/priorities";
import { WhyMatched } from "@/features/direction/components/why-matched";
import { MAX_REASONS, priorityReason, whyMatched, type RoleReview } from "@/features/direction/why-matched";
import { ProfileInput } from "@/features/profile/schemas";

function review(overrides: Partial<RoleReview> = {}): RoleReview {
  return {
    userId: "a",
    roleType: "software",
    rotationNumber: 1,
    enjoyment: 4,
    learning: 5,
    mentorship: 5,
    clarityGained: 3,
    wouldReturn: "yes",
    payHourly: 22,
    ...overrides,
  };
}

const PEOPLE_CLAIM = /students?/i;

describe("why this matched (item 20)", () => {
  it("starts with the rule reason and adds a real average for each chosen priority", () => {
    const reviews = [review({ userId: "a", mentorship: 5 }), review({ userId: "b", mentorship: 4 }), review({ userId: "c", roleType: "design", mentorship: 1 })];
    const reasons = whyMatched("Your major lines up directly with software work.", "software", ["mentorship"], reviews);
    expect(reasons).toEqual([
      "Your major lines up directly with software work.",
      "You chose Mentorship as a top priority. 2 students in majors like yours rated mentorship in this role 4.5/5.",
    ]);
  });

  it("adds nothing for a priority with fewer than 2 students, and pay needs 3", () => {
    expect(priorityReason("learning", [review({ userId: "a" }), review({ userId: "a", rotationNumber: 2 })])).toBeNull();
    expect(priorityReason("pay", [review({ userId: "a" }), review({ userId: "b" })])).toBeNull();
    expect(priorityReason("pay", [review({ userId: "a", payHourly: 20.4 }), review({ userId: "b", payHourly: 25 }), review({ userId: "c", payHourly: 30.2 })])).toBe(
      "You chose Pay as a top priority. 3 students in majors like yours reported $20–$31/hr in this role.",
    );
  });

  it("counts students once for would go back", () => {
    const line = priorityReason("would_return", [
      review({ userId: "a", wouldReturn: "no", rotationNumber: 1 }),
      review({ userId: "a", wouldReturn: "yes", rotationNumber: 2 }),
      review({ userId: "b", wouldReturn: "no" }),
    ]);
    expect(line).toBe('You chose "A co-op I\'d go back to" as a top priority. 50% of 2 students in majors like yours would go back to their co-op in this role.');
  });

  it("never gives more than 3 reasons, and every claim about students carries a number", () => {
    const reviews = ["a", "b", "c"].map((userId) => review({ userId }));
    const reasons = whyMatched("Base reason.", "software", ["mentorship", "learning", "enjoyment"], reviews);
    expect(reasons).toHaveLength(MAX_REASONS);
    for (const reason of reasons.slice(1)) {
      expect(reason).toMatch(PEOPLE_CLAIM);
      expect(reason).toMatch(/\d/);
    }
  });

  it("accepts up to 3 distinct priorities and reads stored ones safely", () => {
    expect(PrioritiesInput.safeParse(["pay", "learning", "mentorship"]).success).toBe(true);
    expect(PrioritiesInput.safeParse(["pay", "learning", "mentorship", "clarity"]).success).toBe(false);
    expect(PrioritiesInput.safeParse(["pay", "pay"]).success).toBe(false);
    expect(PrioritiesInput.safeParse(["salary"]).success).toBe(false);
    expect(readPriorities(["pay", "bogus", "pay", "learning"])).toEqual(["pay", "learning"]);
    expect(ProfileInput.shape.priorities.safeParse(undefined).success).toBe(true);
  });

  it("renders the list and points students without priorities to their Profile", () => {
    const html = renderToStaticMarkup(<WhyMatched reasons={["One.", "Two."]} hasPriorities={false} />);
    expect(html).toContain("Why this matched");
    expect(html).toContain("<li>One.</li>");
    expect(html).toContain('href="/profile"');
    expect(renderToStaticMarkup(<WhyMatched reasons={["One."]} hasPriorities />)).not.toContain('href="/profile"');
  });

  it("says in the privacy policy that priorities are collected and how they are used", () => {
    const html = renderToStaticMarkup(<PrivacyPage />);
    expect(html).toContain("up to 3 things that");
    expect(html).toContain("majors");
  });
});

describe("saving priorities", () => {
  it("binds each priority as its own parameter in a text[] literal", async () => {
    const { PgDialect } = await import("drizzle-orm/pg-core");
    const { textArraySql } = await import("@/features/profile/server");
    const dialect = new PgDialect();
    const query = dialect.sqlToQuery(textArraySql(["pay", "learning"]));
    expect(query.sql).toBe("array[$1, $2]::text[]");
    expect(query.params).toEqual(["pay", "learning"]);
    expect(dialect.sqlToQuery(textArraySql([])).sql).toBe("'{}'::text[]");
  });
});
