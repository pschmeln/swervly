"use client";

import { useState } from "react";
import { Button, Card, Field, Select } from "@/components/ui";
import { focusRing } from "@/components/ui/controls";
import { CompanyAveragesSummary, NOTHING_YET } from "@/features/company/averages-section";
import { companiesForDirection, type DirectoryCompany } from "@/features/community/directory-filter";
import type { FamilyId } from "@/features/atlas/types";
import { careerPageHref } from "@/features/explore/links";

export const SHOW_ALL = "Show all companies";
export const DIRECTORY_INTRO =
  "Official careers pages for organizations that hire co-ops and engineers. This directory does not list open positions.";

function CareersLink({ url, checkedOn }: { url: string | null; checkedOn: string | null }) {
  const href = url ? careerPageHref(url) : null;
  if (!href) return <p className="text-neutral-800">No official careers page is on file.</p>;
  return (
    <p className="text-neutral-800">
      <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-12 flex-wrap items-center gap-2 underline underline-offset-2 ${focusRing}`}>
        Official careers page
        <span className="inline-flex items-center rounded border border-neutral-300 px-1.5 text-xs font-medium no-underline">External</span>
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      {checkedOn ? <span className="mt-1 block text-sm text-neutral-600">Link checked {checkedOn}.</span> : null}
    </p>
  );
}

export function CompanyCard({ company }: { company: DirectoryCompany }) {
  return (
    <Card>
      <h3 className="break-words text-base font-semibold">{company.name}</h3>
      <p className="text-sm text-neutral-600">{company.field}</p>
      <p className="mt-2 text-neutral-800">
        {company.roleCategories.length > 0 ? `Role categories: ${company.roleCategories.join(", ")}` : "No role category is on file."}
      </p>
      <h4 className="mt-3 text-sm font-medium text-neutral-900">Why this company is shown</h4>
      <p className="break-words text-neutral-800">{company.whyShown}</p>
      {company.nearby ? <p className="mt-1 break-words font-medium text-emerald-800">{company.nearby}</p> : null}
      <h4 className="mt-3 text-sm font-medium text-neutral-900">Student ratings</h4>
      {company.averages && company.reviewsHref ? (
        <CompanyAveragesSummary averages={company.averages} href={company.reviewsHref} hasMajor={company.viewerHasMajor ?? false} />
      ) : (
        <p className="text-neutral-800">{NOTHING_YET}</p>
      )}
      <h4 className="mt-3 text-sm font-medium text-neutral-900">Official careers page</h4>
      <CareersLink url={company.careersUrl} checkedOn={company.linkCheckedOn} />
    </Card>
  );
}

/** Companies tab of Community (items 13 and 8): filtered to the chosen direction by default. */
export function CompaniesDirectory({
  companies,
  companyRoles,
  directionTitle,
  directionFamilies,
}: {
  companies: readonly DirectoryCompany[];
  companyRoles: readonly string[];
  directionTitle: string | null;
  directionFamilies: readonly FamilyId[];
}) {
  const canFilter = directionTitle !== null && directionFamilies.length > 0;
  const [byDirection, setByDirection] = useState(canFilter);
  const [role, setRole] = useState("all");
  const base = byDirection && canFilter ? companiesForDirection(companies, directionFamilies) : [...companies];
  const shown = role === "all" ? base : base.filter((company) => company.roleCategories.includes(role));

  return (
    <section aria-labelledby="companies-heading" className="grid gap-3">
      <h2 id="companies-heading" className="text-lg font-semibold">Companies & opportunities</h2>
      <p className="text-neutral-700">{DIRECTORY_INTRO}</p>
      {canFilter ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-neutral-800" aria-live="polite">
            {byDirection ? `Showing ${base.length} companies for your direction: ${directionTitle}.` : `Showing all ${companies.length} companies.`}
          </p>
          <Button variant="secondary" className="w-full sm:w-auto" aria-pressed={!byDirection} onClick={() => setByDirection((value) => !value)}>
            {byDirection ? SHOW_ALL : `Only ${directionTitle}`}
          </Button>
        </div>
      ) : null}
      <Field label="Role category" htmlFor="company-role">
        <Select
          id="company-role"
          value={role}
          onChange={setRole}
          options={[{ value: "all", label: "All role categories" }, ...companyRoles.map((item) => ({ value: item, label: item }))]}
        />
      </Field>
      {shown.length === 0 ? (
        <p className="text-neutral-800">
          {byDirection && canFilter ? "No companies in the directory are listed under your direction for this role category yet." : "No companies for this role category."}
        </p>
      ) : null}
      <ul className="grid gap-3">
        {shown.map((company) => (
          <li key={company.id}>
            <CompanyCard company={company} />
          </li>
        ))}
      </ul>
    </section>
  );
}
