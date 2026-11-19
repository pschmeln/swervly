/**
 * Pure functions that turn O*NET database CSV files into the small
 * per-occupation records Career Atlas shows. No I/O here; the CLI in
 * scripts/atlas-import-onet.ts reads the files and writes the output.
 *
 * All text is verbatim O*NET. Swervly only chooses what to show:
 * - tasks: up to 5, highest O*NET Importance first (ties: Core, then file
 *   order); tasks without a usable rating follow, Core first
 * - skills: up to 5 names from essential + transferable skills that O*NET
 *   rates important here (Importance >= 3 of 5) AND more important than in
 *   the average occupation, biggest difference first; suppressed ratings are
 *   skipped; no scores are shown
 * - software: up to 8 entries flagged "In Demand" for the occupation,
 *   skipping generic office tools; nothing if O*NET flags none
 * - preparation: the Job Zone and its reference wording
 * - related: up to 5 "Primary-Short" related occupations, in O*NET's order
 */

export type OnetDetail = {
  onetCode: string;
  description: string;
  tasks: string[];
  skills: string[];
  software: string[];
  jobZone: number | null;
  related: { onetCode: string; title: string }[];
};

export type JobZoneInfo = { name: string; education: string; experience: string };

export const MAX_TASKS = 5;
export const MAX_SKILLS = 5;
/** O*NET Importance runs 1-5; 3 is "Important". */
export const MIN_SKILL_IMPORTANCE = 3;
export const MAX_SOFTWARE = 8;
export const MAX_RELATED = 5;

/** Office tools listed for almost every job; they tell a student nothing about the work. */
export const GENERIC_SOFTWARE = new Set([
  "Microsoft Office software",
  "Microsoft Outlook",
  "Microsoft PowerPoint",
  "Microsoft Word",
  "Microsoft Excel",
  "Google Docs",
  "Email software",
]);

/** RFC 4180 CSV: commas, quoted fields, doubled quotes, CRLF or LF. Returns rows of fields. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  const input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell !== ""));
}

/** Rows as objects keyed by the header row. Throws if a required column is missing. */
export function csvRecords(text: string, required: readonly string[]): Record<string, string>[] {
  const [header, ...body] = parseCsv(text);
  if (!header) throw new Error("empty CSV");
  for (const column of required) {
    if (!header.includes(column)) throw new Error(`missing column "${column}"`);
  }
  return body.map((cells) => Object.fromEntries(header.map((name, index) => [name, cells[index] ?? ""])));
}

const CODE = "O*NET-SOC Code";

export type OnetFiles = {
  occupationData: string;
  taskStatements: string;
  taskRatings: string;
  essentialSkills: string;
  transferableSkills: string;
  softwareSkills: string;
  jobZones: string;
  relatedOccupations: string;
};

function importanceByCode(text: string, idColumn: string, wanted: ReadonlySet<string>): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  for (const record of csvRecords(text, [CODE, idColumn, "Scale ID", "Data Value", "Recommend Suppress"])) {
    const code = record[CODE];
    if (!wanted.has(code) || record["Scale ID"] !== "IM" || record["Recommend Suppress"] === "Y") continue;
    const value = Number(record["Data Value"]);
    if (!Number.isFinite(value)) continue;
    const map = result.get(code) ?? new Map<string, number>();
    map.set(record[idColumn], value);
    result.set(code, map);
  }
  return result;
}

export function buildDetails(codes: readonly string[], files: OnetFiles): { details: OnetDetail[]; missing: string[] } {
  const wanted = new Set(codes);

  const descriptions = new Map<string, string>();
  for (const record of csvRecords(files.occupationData, [CODE, "Title", "Description"])) {
    if (wanted.has(record[CODE])) descriptions.set(record[CODE], record.Description.trim());
  }

  type TaskRow = { id: string; text: string; core: boolean; order: number };
  const tasks = new Map<string, TaskRow[]>();
  let order = 0;
  for (const record of csvRecords(files.taskStatements, [CODE, "Task ID", "Task", "Task Type"])) {
    const code = record[CODE];
    if (!wanted.has(code) || !record.Task.trim()) continue;
    tasks.set(code, [...(tasks.get(code) ?? []), { id: record["Task ID"], text: record.Task.trim(), core: record["Task Type"] === "Core", order: order++ }]);
  }
  const taskImportance = importanceByCode(files.taskRatings, "Task ID", wanted);

  // Skills: averages are taken over every occupation in the files, not only ours.
  type SkillRow = { name: string; value: number };
  const skills = new Map<string, SkillRow[]>();
  const totals = new Map<string, { sum: number; count: number }>();
  for (const text of [files.essentialSkills, files.transferableSkills]) {
    for (const record of csvRecords(text, [CODE, "Element Name", "Scale ID", "Data Value", "Recommend Suppress"])) {
      if (record["Scale ID"] !== "IM" || record["Recommend Suppress"] === "Y") continue;
      const value = Number(record["Data Value"]);
      if (!Number.isFinite(value)) continue;
      const name = record["Element Name"].trim();
      const total = totals.get(name) ?? { sum: 0, count: 0 };
      totals.set(name, { sum: total.sum + value, count: total.count + 1 });
      const code = record[CODE];
      if (wanted.has(code)) skills.set(code, [...(skills.get(code) ?? []), { name, value }]);
    }
  }
  const average = (name: string) => {
    const total = totals.get(name);
    return total && total.count > 0 ? total.sum / total.count : 0;
  };

  const software = new Map<string, string[]>();
  for (const record of csvRecords(files.softwareSkills, [CODE, "Workplace Example", "In Demand"])) {
    const code = record[CODE];
    const name = record["Workplace Example"].trim();
    if (!wanted.has(code) || record["In Demand"] !== "Y" || !name || GENERIC_SOFTWARE.has(name)) continue;
    const list = software.get(code) ?? [];
    if (!list.includes(name)) software.set(code, [...list, name]);
  }

  const jobZones = new Map<string, number>();
  for (const record of csvRecords(files.jobZones, [CODE, "Job Zone"])) {
    const zone = Number(record["Job Zone"]);
    if (wanted.has(record[CODE]) && Number.isInteger(zone)) jobZones.set(record[CODE], zone);
  }

  const related = new Map<string, { onetCode: string; title: string; index: number }[]>();
  for (const record of csvRecords(files.relatedOccupations, [CODE, "Related O*NET-SOC Code", "Related Title", "Relatedness Tier", "Index"])) {
    const code = record[CODE];
    if (!wanted.has(code) || record["Relatedness Tier"] !== "Primary-Short") continue;
    related.set(code, [
      ...(related.get(code) ?? []),
      { onetCode: record["Related O*NET-SOC Code"], title: record["Related Title"].trim(), index: Number(record.Index) },
    ]);
  }

  const details: OnetDetail[] = [];
  const missing: string[] = [];
  for (const code of [...codes].sort()) {
    const description = descriptions.get(code);
    const rows = tasks.get(code) ?? [];
    if (!description || rows.length === 0) {
      missing.push(code);
      continue;
    }
    const ratings = taskImportance.get(code) ?? new Map<string, number>();
    const rankedTasks = [...rows]
      .sort((left, right) => {
        const a = ratings.get(left.id);
        const b = ratings.get(right.id);
        if (a !== undefined && b !== undefined && a !== b) return b - a;
        if ((a === undefined) !== (b === undefined)) return a === undefined ? 1 : -1;
        if (left.core !== right.core) return left.core ? -1 : 1;
        return left.order - right.order;
      })
      .slice(0, MAX_TASKS)
      .map((row) => row.text);
    const topSkills = [...(skills.get(code) ?? [])]
      .filter((row) => row.value >= MIN_SKILL_IMPORTANCE && row.value > average(row.name))
      .sort((left, right) => right.value - average(right.name) - (left.value - average(left.name)) || left.name.localeCompare(right.name))
      .slice(0, MAX_SKILLS)
      .map((row) => row.name);
    details.push({
      onetCode: code,
      description,
      tasks: rankedTasks,
      skills: topSkills,
      software: (software.get(code) ?? []).slice(0, MAX_SOFTWARE),
      jobZone: jobZones.get(code) ?? null,
      related: [...(related.get(code) ?? [])]
        .sort((left, right) => left.index - right.index)
        .slice(0, MAX_RELATED)
        .map(({ onetCode, title }) => ({ onetCode, title })),
    });
  }
  return { details, missing };
}

/** job_zone_reference.csv → zone number → wording. Row "2" covers zones 1 and 2 in this release. */
export function buildJobZones(text: string): Record<number, JobZoneInfo> {
  const result: Record<number, JobZoneInfo> = {};
  for (const record of csvRecords(text, ["Job Zone", "Name", "Education", "Experience"])) {
    const zone = Number(record["Job Zone"]);
    if (!Number.isInteger(zone)) continue;
    result[zone] = { name: record.Name.trim(), education: record.Education.trim(), experience: record.Experience.trim() };
  }
  if (result[2] && !result[1]) result[1] = result[2];
  return result;
}

const json = (value: unknown) => JSON.stringify(value);

/** The generated TypeScript module. Stable output so re-running on the same files changes nothing. */
export function renderDetailsModule(details: readonly OnetDetail[], zones: Record<number, JobZoneInfo>, release: string): string {
  const zoneBody = Object.keys(zones)
    .map(Number)
    .sort((a, b) => a - b)
    .map((zone) => `  ${zone}: { name: ${json(zones[zone].name)}, education: ${json(zones[zone].education)}, experience: ${json(zones[zone].experience)} },`)
    .join("\n");
  const body = details
    .map(
      (detail) =>
        `  ${json(detail.onetCode)}: {\n` +
        `    description: ${json(detail.description)},\n` +
        `    tasks: [\n${detail.tasks.map((task) => `      ${json(task)},`).join("\n")}\n    ],\n` +
        `    skills: [${detail.skills.map(json).join(", ")}],\n` +
        `    software: [${detail.software.map(json).join(", ")}],\n` +
        `    jobZone: ${detail.jobZone ?? "null"},\n` +
        `    related: [${detail.related.map((item) => `{ onetCode: ${json(item.onetCode)}, title: ${json(item.title)} }`).join(", ")}],\n` +
        `  },`,
    )
    .join("\n");
  return `// GENERATED by scripts/atlas-import-onet.ts from the O*NET ${release} Database (CSV). Do not edit by hand.
// All text is verbatim O*NET. Swervly chose: up to ${MAX_TASKS} tasks (highest Importance first), up to ${MAX_SKILLS}
// skills rated important here and more important than in the average occupation (no scores shown), up to ${MAX_SOFTWARE} "In Demand" software entries minus
// common office tools, the Job Zone, and up to ${MAX_RELATED} "Primary-Short" related occupations.

export const ONET_RELEASE = ${json(release)};

export type OnetJobZone = { name: string; education: string; experience: string };

export const ONET_JOB_ZONES: Readonly<Record<number, OnetJobZone>> = {
${zoneBody}
};

export type OnetDetailRecord = {
  description: string;
  tasks: readonly string[];
  skills: readonly string[];
  software: readonly string[];
  jobZone: number | null;
  related: readonly { onetCode: string; title: string }[];
};

export const ONET_DETAILS: Readonly<Record<string, OnetDetailRecord>> = {
${body}
};
`;
}
