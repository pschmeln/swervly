/**
 * Pure functions that turn O*NET database CSV files into the small
 * per-occupation records Career Atlas shows. No I/O here; the CLI in
 * scripts/atlas-import-onet.ts reads the files and writes the output.
 *
 * Selection rules (Swervly's, stated on screen as "selected by Swervly"):
 * - description: verbatim from occupation_data.csv
 * - tasks: up to 5, Core tasks first, then the rest, each in file order, verbatim
 * - software: up to 8 entries flagged "In Demand" for that occupation,
 *   skipping generic office tools; nothing if O*NET flags none
 */

export type OnetDetail = {
  onetCode: string;
  description: string;
  tasks: string[];
  software: string[];
};

export const MAX_TASKS = 5;
export const MAX_SOFTWARE = 8;

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

export function buildDetails(
  codes: readonly string[],
  files: { occupationData: string; taskStatements: string; softwareSkills: string },
): { details: OnetDetail[]; missing: string[] } {
  const wanted = new Set(codes);
  const descriptions = new Map<string, string>();
  for (const record of csvRecords(files.occupationData, [CODE, "Title", "Description"])) {
    if (wanted.has(record[CODE])) descriptions.set(record[CODE], record.Description.trim());
  }

  const core = new Map<string, string[]>();
  const other = new Map<string, string[]>();
  for (const record of csvRecords(files.taskStatements, [CODE, "Task", "Task Type"])) {
    const code = record[CODE];
    if (!wanted.has(code) || !record.Task.trim()) continue;
    const target = record["Task Type"] === "Core" ? core : other;
    target.set(code, [...(target.get(code) ?? []), record.Task.trim()]);
  }

  const software = new Map<string, string[]>();
  for (const record of csvRecords(files.softwareSkills, [CODE, "Workplace Example", "In Demand"])) {
    const code = record[CODE];
    const name = record["Workplace Example"].trim();
    if (!wanted.has(code) || record["In Demand"] !== "Y" || !name || GENERIC_SOFTWARE.has(name)) continue;
    const list = software.get(code) ?? [];
    if (!list.includes(name)) software.set(code, [...list, name]);
  }

  const details: OnetDetail[] = [];
  const missing: string[] = [];
  for (const code of [...codes].sort()) {
    const description = descriptions.get(code);
    const tasks = [...(core.get(code) ?? []), ...(other.get(code) ?? [])].slice(0, MAX_TASKS);
    if (!description || tasks.length === 0) {
      missing.push(code);
      continue;
    }
    details.push({ onetCode: code, description, tasks, software: (software.get(code) ?? []).slice(0, MAX_SOFTWARE) });
  }
  return { details, missing };
}

/** The generated TypeScript module. Stable output so re-running on the same files changes nothing. */
export function renderDetailsModule(details: readonly OnetDetail[], release: string): string {
  const body = details
    .map(
      (detail) =>
        `  ${JSON.stringify(detail.onetCode)}: {\n` +
        `    description: ${JSON.stringify(detail.description)},\n` +
        `    tasks: [\n${detail.tasks.map((task) => `      ${JSON.stringify(task)},`).join("\n")}\n    ],\n` +
        `    software: [${detail.software.map((name) => JSON.stringify(name)).join(", ")}],\n` +
        `  },`,
    )
    .join("\n");
  return `// GENERATED by scripts/atlas-import-onet.ts from the O*NET ${release} Database (CSV). Do not edit by hand.
// Descriptions and tasks are verbatim. Swervly selected up to ${MAX_TASKS} tasks (Core first, file order)
// and up to ${MAX_SOFTWARE} software entries O*NET flags "In Demand" for the occupation, skipping generic office tools.

export const ONET_RELEASE = ${JSON.stringify(release)};

export type OnetDetailRecord = { description: string; tasks: readonly string[]; software: readonly string[] };

export const ONET_DETAILS: Readonly<Record<string, OnetDetailRecord>> = {
${body}
};
`;
}
