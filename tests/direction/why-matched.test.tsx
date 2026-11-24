import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PrivacyPage from "@/app/privacy/page";
import { PrioritiesInput, readPriorities } from "@/features/direction/priorities";
import { CORRECTION_PROMPT, WhyMatched } from "@/features/direction/components/why-matched";
import type { ReasonPart } from "@/features/direction/explain";
import { MAX_PRIORITY_REASONS, priorityReason, whyMatched, type RoleReview } from "@/features/direction/why-matched";
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
  const majorLine: ReasonPart = { kind: "major", text: "Computer Science coursework includes programming, algorithms and software design, which software work builds on." };

  it("starts with the suggestion's own lines and adds a real average for each chosen priority", () => {
    const reviews = [review({ userId: "a", mentorship: 5 }), review({ userId: "b", mentorship: 4 }), review({ userId: "c", roleType: "design", mentorship: 1 })];
    const lines = whyMatched([majorLine], "software", ["mentorship"], reviews);
    expect(lines).toEqual([
      majorLine,
      { kind: "priority", text: "You chose Mentorship as a top priority. 2 students in majors like yours rated mentorship in this role 4.5/5." },
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

  it("adds at most 2 priority lines, and every claim about students carries a number", () => {
    const reviews = ["a", "b", "c"].map((userId) => review({ userId }));
    const base: ReasonPart[] = [{ kind: "quiz", text: "You like new problems." }, majorLine];
    const lines = whyMatched(base, "software", ["mentorship", "learning", "enjoyment"], reviews);
    expect(lines).toHaveLength(base.length + MAX_PRIORITY_REASONS);
    for (const line of lines.slice(base.length)) {
      expect(line.kind).toBe("priority");
      expect(line.text).toMatch(PEOPLE_CLAIM);
      expect(line.text).toMatch(/\d/);
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

  it("labels where every line comes from and points students without priorities to their Profile", () => {
    const parts: ReasonPart[] = [{ kind: "quiz", text: "One." }, majorLine, { kind: "reviews", text: "2 students rated it 4.5/5." }];
    const html = renderToStaticMarkup(<WhyMatched parts={parts} hasPriorities={false} />);
    expect(html).toContain("Why this matched");
    expect(html).toMatch(/Your quiz<\/span>One\./);
    expect(html).toMatch(/Your major<\/span>Computer Science coursework/);
    expect(html).toMatch(/Student reviews<\/span>2 students/);
    expect(html).toContain("Pick what matters most");
    expect(renderToStaticMarkup(<WhyMatched parts={parts} hasPriorities />)).not.toContain("Pick what matters most");
  });

  it("lets a student correct the inputs behind the reasons", () => {
    const html = renderToStaticMarkup(<WhyMatched parts={[majorLine]} hasPriorities />);
    expect(html).toContain(CORRECTION_PROMPT);
    expect(html).toContain('href="/profile"');
    expect(html).toContain('href="/onboarding?retake=1"');
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
