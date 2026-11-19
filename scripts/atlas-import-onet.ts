/**
 * Import O*NET details for the Career Atlas occupations.
 *
 * 1. Download the O*NET database (CSV) from https://www.onetcenter.org/database.html
 * 2. Unzip it, then run:
 *      npx tsx scripts/atlas-import-onet.ts <folder with the CSVs> <release, e.g. 30.3>
 * 3. Review the diff of src/content/atlas/onet-details.ts and commit it.
 *
 * Reads only occupation_data.csv, task_statements.csv and software_skills.csv.
 * Writes only src/content/atlas/onet-details.ts. Nothing is sent anywhere.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { OCCUPATIONS } from "../src/content/atlas/occupations";
import { buildDetails, renderDetailsModule } from "../src/features/atlas/onet-import";

const [folder, release] = process.argv.slice(2);
if (!folder || !release || !/^\d+\.\d+$/.test(release)) {
  console.error("Usage: npx tsx scripts/atlas-import-onet.ts <csv folder> <release, e.g. 30.3>");
  process.exit(2);
}

const read = (name: string) => readFileSync(path.join(folder, name), "utf8");
const { details, missing } = buildDetails(
  OCCUPATIONS.map((item) => item.onetCode),
  {
    occupationData: read("occupation_data.csv"),
    taskStatements: read("task_statements.csv"),
    softwareSkills: read("software_skills.csv"),
  },
);

if (missing.length > 0) {
  console.error(`No description or tasks for: ${missing.join(", ")}. Check the codes in src/content/atlas/occupations.ts.`);
  process.exit(1);
}

const out = path.join(process.cwd(), "src/content/atlas/onet-details.ts");
writeFileSync(out, renderDetailsModule(details, release));
console.log(`Wrote ${details.length} occupations from O*NET ${release} to ${path.relative(process.cwd(), out)}.`);
