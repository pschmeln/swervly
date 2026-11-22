/**
 * Check every company's official careers page and record the result.
 *
 * Run on a machine with normal internet access (agents' sandboxes block these hosts):
 *   npx tsx scripts/check-career-links.ts              check every company with a careers URL
 *   npx tsx scripts/check-career-links.ts --only pg,mayo   re-check some, keep the rest
 *
 * Reads src/content/companies.ts. Writes src/content/career-link-checks.ts and prints a
 * summary. One GET per URL, four at a time, 20 s timeout. No crawling, nothing scheduled,
 * nothing sent anywhere else. Review the diff before committing.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { CAREER_LINK_CHECKS } from "../src/content/career-link-checks";
import { COMPANIES, type CompanyEntry } from "../src/content/companies";
import { judgeCheck, pageTitle, renderChecksModule, type CareerLinkCheck } from "../src/features/companies/link-check";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const MAX_BYTES = 400_000;
const PARALLEL = 4;

function today(): string {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

async function readCapped(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => undefined);
  return new TextDecoder().decode(Buffer.concat(chunks));
}

async function check(company: CompanyEntry, checkedOn: string): Promise<CareerLinkCheck> {
  const careers = company.careers!;
  // Fields in CareerLinkCheck order, so re-runs diff cleanly.
  const row = (fields: Omit<CareerLinkCheck, "companyId" | "requestedUrl" | "checkedOn" | "accepted" | "reason">, verdict: { accepted: boolean; reason: string | null }): CareerLinkCheck => ({
    companyId: company.id,
    requestedUrl: careers.url,
    finalUrl: fields.finalUrl,
    finalHost: fields.finalHost,
    httpStatus: fields.httpStatus,
    title: fields.title,
    checkedOn,
    accepted: verdict.accepted,
    reason: verdict.reason,
  });
  try {
    const response = await fetch(careers.url, {
      redirect: "follow",
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(20_000),
    });
    const html = await readCapped(response);
    const finalUrl = response.url || careers.url;
    const verdict = judgeCheck({ hostSuffix: careers.hostSuffix, finalUrl, httpStatus: response.status, html });
    return row({ finalUrl, finalHost: new URL(finalUrl).host, httpStatus: response.status, title: pageTitle(html) }, verdict);
  } catch (error) {
    const cause = error instanceof Error ? (error.cause as { code?: string } | undefined)?.code ?? error.name : "error";
    return row({ finalUrl: null, finalHost: null, httpStatus: null, title: null }, { accepted: false, reason: `request failed (${cause})` });
  }
}

async function main() {
  const onlyFlag = process.argv.indexOf("--only");
  const only = onlyFlag >= 0 ? new Set((process.argv[onlyFlag + 1] ?? "").split(",").filter(Boolean)) : null;
  const targets = COMPANIES.filter((company) => company.careers && (!only || only.has(company.id)));
  if (only) {
    const unknown = [...only].filter((id) => !COMPANIES.some((company) => company.id === id && company.careers));
    if (unknown.length > 0) {
      console.error(`No careers URL on file for: ${unknown.join(", ")}`);
      process.exit(2);
    }
  }

  const checkedOn = today();
  const results: CareerLinkCheck[] = [];
  for (let index = 0; index < targets.length; index += PARALLEL) {
    const batch = await Promise.all(targets.slice(index, index + PARALLEL).map((company) => check(company, checkedOn)));
    results.push(...batch);
    process.stdout.write(`\rChecked ${results.length} of ${targets.length}`);
  }
  process.stdout.write("\n");

  const kept = only ? CAREER_LINK_CHECKS.filter((row) => !only.has(row.companyId)) : [];
  const out = path.join(process.cwd(), "src/content/career-link-checks.ts");
  writeFileSync(out, renderChecksModule([...kept, ...results]));

  const rejected = results.filter((row) => !row.accepted);
  console.log(`Accepted ${results.length - rejected.length}, rejected ${rejected.length}. Wrote ${path.relative(process.cwd(), out)}.`);
  for (const row of rejected) console.log(`  rejected ${row.companyId}: ${row.reason} (${row.requestedUrl})`);
}

main().catch((error) => {
  console.error("Link check failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
