export type Ymd = { year: number; month: number; day: number };

export type WeekRange = { start: Date; end: Date };

const WEEKDAY_INDEX: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

/** The student's current IANA zone, from the runtime that is rendering the page. */
export function studentTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function parts(instant: Date, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: string } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(instant)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  // h23 is 0–23. A 24 from an older ICU means midnight at the end of that civil day.
  if (hour === 24) hour = 0;
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    second: Number(map.second),
    weekday: map.weekday ?? "",
  };
}

/** Milliseconds to add to UTC to get the civil clock in `timeZone` (negative in the US). */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const p = parts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - instant.getTime();
}

/** UTC instant of a civil date-time in `timeZone`. Midnight exists on both sides of a DST change. */
export function civilToInstant(year: number, month: number, day: number, hour: number, minute: number, second: number, timeZone: string): Date {
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const offset1 = zoneOffsetMs(new Date(asIfUtc), timeZone);
  let instant = new Date(asIfUtc - offset1);
  const offset2 = zoneOffsetMs(instant, timeZone);
  if (offset2 !== offset1) instant = new Date(asIfUtc - offset2);
  return instant;
}

export function ymdInZone(instant: Date, timeZone: string): Ymd {
  const p = parts(instant, timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

export function addDays(ymd: Ymd, days: number): Ymd {
  const utc = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

/**
 * Monday 00:00 through the next Monday 00:00 in `timeZone`.
 * The end is exclusive. The span is built by adding calendar days, so a week
 * that contains a DST change is 167 or 169 hours rather than a flat 168.
 */
export function localWeekRange(now: Date, timeZone: string = studentTimeZone()): WeekRange {
  const ymd = ymdInZone(now, timeZone);
  const weekday = WEEKDAY_INDEX[parts(now, timeZone).weekday];
  if (weekday === undefined) {
    throw new Error(`Unknown weekday in ${timeZone}`);
  }
  const monday = addDays(ymd, -weekday);
  const nextMonday = addDays(monday, 7);
  return {
    start: civilToInstant(monday.year, monday.month, monday.day, 0, 0, 0, timeZone),
    end: civilToInstant(nextMonday.year, nextMonday.month, nextMonday.day, 0, 0, 0, timeZone),
  };
}

export function isInLocalWeek(iso: string | null, now: Date, timeZone: string = studentTimeZone()): boolean {
  if (!iso) return false;
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return false;
  const { start, end } = localWeekRange(now, timeZone);
  return instant.getTime() >= start.getTime() && instant.getTime() < end.getTime();
}
