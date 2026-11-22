import { describe, expect, it } from "vitest";
import { isInLocalWeek, localWeekRange, studentTimeZone } from "@/features/action-ui/week";

const NY = "America/New_York";
const HOUR = 60 * 60 * 1000;

describe("local week boundaries", () => {
  it("uses the runtime time zone when none is passed", () => {
    expect(studentTimeZone().length).toBeGreaterThan(0);
    const now = new Date("2026-11-18T15:00:00.000Z");
    const week = localWeekRange(now);
    expect(week.end.getTime()).toBeGreaterThan(week.start.getTime());
    expect(isInLocalWeek(now.toISOString(), now)).toBe(true);
    expect(isInLocalWeek(new Date(now.getTime() - 8 * 24 * HOUR).toISOString(), now)).toBe(false);
    expect(isInLocalWeek(null, now)).toBe(false);
    expect(isInLocalWeek("not-a-date", now)).toBe(false);
  });

  it("keeps a Sunday evening in the student's week when UTC is already Monday", () => {
    const now = new Date("2026-11-23T04:30:00.000Z");
    const week = localWeekRange(now, NY);
    expect(week.start.toISOString()).toBe("2026-11-16T05:00:00.000Z");
    expect(week.end.toISOString()).toBe("2026-11-23T05:00:00.000Z");
    expect(isInLocalWeek("2026-11-23T04:00:00.000Z", now, NY)).toBe(true);
    expect(isInLocalWeek("2026-11-23T05:00:00.000Z", now, NY)).toBe(false);
    expect(isInLocalWeek("2026-11-16T04:59:00.000Z", now, NY)).toBe(false);
  });

  it("spans 167 hours across the spring-forward week", () => {
    const now = new Date("2026-03-04T15:00:00.000Z");
    const week = localWeekRange(now, NY);
    expect(week.start.toISOString()).toBe("2026-03-02T05:00:00.000Z");
    expect(week.end.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(week.end.getTime() - week.start.getTime()).toBe(167 * HOUR);
    expect(isInLocalWeek("2026-03-08T16:00:00.000Z", now, NY)).toBe(true);
    expect(isInLocalWeek("2026-03-09T04:00:00.000Z", now, NY)).toBe(false);
    expect(isInLocalWeek("2026-03-02T04:59:00.000Z", now, NY)).toBe(false);
  });

  it("spans 169 hours across the fall-back week, including both 1:30s", () => {
    const now = new Date("2026-10-28T15:00:00.000Z");
    const week = localWeekRange(now, NY);
    expect(week.start.toISOString()).toBe("2026-10-26T04:00:00.000Z");
    expect(week.end.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(week.end.getTime() - week.start.getTime()).toBe(169 * HOUR);
    expect(isInLocalWeek("2026-11-01T05:30:00.000Z", now, NY)).toBe(true);
    expect(isInLocalWeek("2026-11-01T06:30:00.000Z", now, NY)).toBe(true);
    expect(isInLocalWeek("2026-11-02T05:00:00.000Z", now, NY)).toBe(false);
  });
});
