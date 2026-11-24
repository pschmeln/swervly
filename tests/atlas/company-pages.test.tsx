import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const captured: { sql: string; params: unknown[] }[] = [];
let rows: unknown[][] = [];
let fail = false;

vi.mock("@/db", async () => {
  const { drizzle } = await import("drizzle-orm/pg-proxy");
  return {
    db: drizzle(async (sql, params) => {
      captured.push({ sql, params });
      if (fail) throw new Error("db down");
      return { rows };
    }),
  };
});

import { COMPANY_PAGE_LABEL, OrganizationsCard } from "@/features/atlas/components/atlas-sections";
import { companyPageHrefs } from "@/features/atlas/company-pages";
import { normalizeEmployerName } from "@/features/review/normalize";

const EMPLOYER = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  captured.length = 0;
  rows = [];
  fail = false;
});

describe("directory company → Swervly company page", () => {
  it("links a directory company to its approved employer page by normalized name", async () => {
    rows = [[EMPLOYER, normalizeEmployerName("3M")]];
    const hrefs = await companyPageHrefs();
    expect(hrefs["3m"]).toBe(`/companies/${EMPLOYER}`);
    expect(captured[0]?.sql).toContain('"status" = $');
    expect(captured[0]?.params).toContain("approved");
  });

  it("has no links when nothing matches or the read fails", async () => {
    expect(await companyPageHrefs()).toEqual({});
    fail = true;
    expect(await companyPageHrefs()).toEqual({});
  });

  it("shows the Swervly page link next to, and separate from, the official careers page", () => {
    const base = { id: "3m", name: "3M", field: "Manufacturing", careersUrl: "https://www.3m.com/careers", areas: ["Design"] };
    const html = renderToStaticMarkup(<OrganizationsCard companies={[{ ...base, reviewsHref: `/companies/${EMPLOYER}` }]} />);
    expect(html).toContain(`href="/companies/${EMPLOYER}"`);
    expect(html).toContain(COMPANY_PAGE_LABEL);
    expect(html).toContain("Official careers page");
    expect(renderToStaticMarkup(<OrganizationsCard companies={[base]} />)).not.toContain(COMPANY_PAGE_LABEL);
  });
});
