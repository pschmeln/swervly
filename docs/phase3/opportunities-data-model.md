# Opportunities data model (design only)

Status: design, plus a small checked list of official careers URLs used by the prototype. This branch does not add a table, a migration, a scraper, or a job feed. It never says a position is open.

The list is independent of Phase 2's major catalog. Company cards take plain `roleCategories` strings and a `whyShown` sentence. They do not read `users.major`.

## Principles

- A card is an organization and a link to that organization's own careers site.
- Swervly does not copy job posts and does not invent openings. The prototype sentence is "This screen does not list positions."
- "Why this company is shown" is separate from "Student experiences." A missing experience says "None yet." It does not show a score, a percentage, or a satisfaction claim.
- Student text appears only when that sample's `sharingConsent` is true. The Mayo Clinic card has a consent-off fixture in the mock module and still says "None yet."
- External links are `https`, exact members of the checked list, `target="_blank"`, and `rel="noopener noreferrer"`, with a visible External label.
- An empty company is a real state. The invented card "Sample Org With No Page On File" has no URL and no experiences.

## Checked links

Checked on **2026-11-17** with one HTTP GET per URL from this workspace (browser User-Agent, redirects followed). A row is in the list only when the final status was 200, the final host belongs to the organization, and the HTML title or text identified a careers page. Source of truth in code: `src/features/explore/links.ts` (`VERIFIED_CAREER_LINKS`). The screen links the **final** URL only. `careerPageHref` rejects every other string, including the pre-redirect URL when it differs.

| Organization | Field on the card | Requested URL | Final URL | Final host |
| --- | --- | --- | --- | --- |
| Procter & Gamble | Consumer products | `https://www.pgcareers.com/` | `https://www.pgcareers.com/us/en` | `www.pgcareers.com` |
| The Kroger Co. | Grocery retail | `https://jobs.kroger.com/` | `https://www.krogerfamilycareers.com/en/sites/CX_2001` | `www.krogerfamilycareers.com` |
| Cincinnati Children's Hospital Medical Center | Pediatric healthcare | `https://www.cincinnatichildrens.org/careers` | same | `www.cincinnatichildrens.org` |
| PNC | Banking | `https://careers.pnc.com/` | `https://careers.pnc.com/global/en` | `careers.pnc.com` |
| GE Aerospace | Aerospace manufacturing | `https://careers.geaerospace.com/` | `https://careers.geaerospace.com/global/en` | `careers.geaerospace.com` |
| Mayo Clinic | Healthcare | `https://jobs.mayoclinic.org/` | same | `jobs.mayoclinic.org` |
| Deloitte | Consulting | `https://www.deloitte.com/us/en/careers.html` | `https://www.deloitte.com/us/en/careers/careers.html` | `www.deloitte.com` |
| The Nature Conservancy | Environmental nonprofit | `https://www.nature.org/en-us/about-us/careers/` | same | `www.nature.org` |
| Federal Reserve Bank of Cleveland | Public finance | `https://www.clevelandfed.org/careers` | same | `www.clevelandfed.org` |
| IDEO | Design | `https://www.ideo.com/careers` | same | `www.ideo.com` |
| Teach For America | Education | `https://www.teachforamerica.org/careers` | `https://www.teachforamerica.org/about/careers` | `www.teachforamerica.org` |
| U.S. Environmental Protection Agency | Environmental protection | `https://www.epa.gov/careers` | same | `www.epa.gov` |

Titles observed on that check (evidence only, not product copy): P&G Careers US; The Kroger Co. (careers text on the page); Career Opportunities at Cincinnati Children's; PNC Careers; GE Aerospace careers; Working at Mayo Clinic; Careers at Deloitte US; Careers at The Nature Conservancy; Careers at the Cleveland Fed; IDEO Careers; Careers at Teach For America; Careers at US EPA. Product copy must not repeat words like "vacancies" as if Swervly were listing them.

### Rejected on the same check

These were not added. A 200 is not enough when the body is an error, the certificate does not match, or the body never arrives.

| URL | Result |
| --- | --- |
| `https://www.53.com/content/fifth-third/en/careers.html` | HTTP 200 whose body said the page does not exist |
| `https://careers.53.com/` | Certificate hostname mismatch |
| `https://www.nih.gov/about-nih/jobs-at-nih` | HTTP 404 with a browser User-Agent |
| `https://www.si.edu/ohr` | HTTP 403 |
| `https://us.pg.com/careers/` | HTTP 404 |

Job-board hosts (`linkedin.com`, `indeed.com`, `greenhouse.io`, `lever.co`) are out of scope even if a company uses them. This list does not include them.

## Future tables (not created)

### `career_pages`

One row per organization Swervly is willing to link. This is not a job table.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid pk | |
| `employer_id` | uuid null | Set only when an approved `employers` row is the same organization. Null is allowed: a careers link can exist before any student reviews that employer |
| `display_name` | text not null | |
| `field_label` | text not null | Plain label, not a major id |
| `role_labels` | text[] not null | Plain labels |
| `why_template` | text not null | Sentence shown when a focus label overlaps `role_labels`. Separate from any review aggregate |
| `careers_url` | text not null | Exact https URL |
| `url_host` | text not null | Must match the URL host |
| `checked_on` | date not null | |
| `check_method` | text not null | How that check was done |
| `status` | text not null | `active` or `retired` |

Unique `(careers_url)`. Index `(status)` where `status = 'active'`.

There is no `job_postings` table in this proposal. If a human later approves an official API, add a separate table with `source`, `fetched_on`, and `source_url`, and still do not describe a row as an opening unless that API said so and the row is inside the freshness window. That table is not part of v1.

### `career_page_checks`

Append-only log of checks: `career_page_id`, `checked_on`, `method`, `http_status`, `final_url`, `final_host`, `accepted` boolean. A failed check retires the page (`status = 'retired'`) instead of leaving a stale link up. Retiring is a new row plus a status change, not a silent edit of history.

### Saved opportunities

`saved_career_pages (user_id, career_page_id, created_at)` with unique `(user_id, career_page_id)` and a filter on `user_id` for every read and delete. The prototype's bookmark is not this table. The button says the bookmark is not stored.

## Sourcing and verification

1. A human or an agent proposes an organization, its field, and a careers URL on a domain the organization operates.
2. Someone requests the URL once, follows redirects, and records the requested URL, final URL, final host, status, and the page title.
3. Accept only final status 200, a host that is the organization (not a job board), and a page that is actually a careers page. Record the date and the method on the row.
4. Reject certificate errors, 403/404, and soft 200 error pages. Those stay in the review notes, not in `career_pages`.
5. `careerPageHref` (or its server equivalent) is the only way a URL becomes an `href`. The allowlist is the accepted final URLs. Query strings, other paths, `http`, and userinfo fail closed.

This prototype's check method string lives on `CAREER_LINK_CHECK_METHOD` in `src/features/explore/links.ts`.

## Refresh and staleness

- Re-check every active URL at least every 90 days, with the same acceptance rules.
- A link older than 90 days is stale. The UI should say the link needs a new check, or hide it, until a human accepts a new check. This prototype's date is 2026-11-17, so it is inside that window on the day it was written. It will go stale. There is no scheduler in this branch.
- If a redirect changes the host, retire the row until a person confirms the new host still belongs to the organization.
- Do not infer openings from the careers page wording during a re-check. The check only answers "is this still their careers site?"
- Do not build a crawler. A re-check is a single GET of a known URL, recorded in `career_page_checks`.

## Official APIs later

If an employer or a school offers a documented API, a future integration can:

- Store the API's organization id on `career_pages`.
- Fetch on a schedule the human approves, with the credential in `process.env`, never in the repo.
- Show a row only with `source`, `fetched_on`, and the official URL.
- Drop rows older than the freshness window.
- Keep "why this is shown" as an overlap of plain focus labels, not as a model score.

Scraping HTML for job titles is out of scope for that step too. An API that is not the employer's own (a reseller of postings) needs its own human approval and still has to pass the host rule for any link Swervly renders.

## Mapping to Direction

`/direction/explore` calls `loadDirection` for the signed-in student. Pathways on that screen are those suggestions, including the rules versus student-evidence label. Dismissed role ids are removed again in `directionExploreCopy`. Custom and undecided majors are not a public grouping key: the major text is shown only in the profile block, and company copy does not contain it.

A company card names a shared directory category only for this fixed map: business operations, finance, clinical healthcare, and manufacturing. Engineering design is not treated as product design. Healthcare administration is not treated as clinical work. Software and other roles with no directory category keep the directory sentence. No card gets a percentage or a suitability rating.

An empty major uses the existing direction rules, which return "not enough information" instead of engineering fillers. A missing quiz leaves pathways empty and points back to the quiz.

## What the prototype does instead

`CATALOG_COMPANIES` holds the 12 organizations and one invented empty card. Invalid URLs become "No official careers page is on file." Save, filter, discussions, and sample experiences stay on the screen. `/direction` still dismisses suggestions and still links onward to explore. It does not import the mock module.
