# Career Atlas

Status: B1 (data, graph, tests) is on `main`. B2 adds the `/direction/atlas` drill-down (live in production since 2026-11-18; the on/off switch was removed on 2026-11-22) and O*NET 31.0 content: descriptions, top tasks, standout skills, in-demand software, Job Zone and related occupations. Stage C adds compare, organizations and Direction evidence. Stage D adds saved choices (migration 0007, applied to dev-peter, dev-li and production on 2026-11-18) and the scale plan in `docs/career-atlas-stage-d.md`.

Full design (Stage A): the "Career Atlas — Stage A Architecture Proposal" doc shared by the founders.

## What it is

A career graph that students browse as a tree. A major is an entry point, not the root.

| Level | Example id | Provenance |
| --- | --- | --- |
| Domain | `dom:engineering` | Swervly editorial |
| Family | `fam:simulation-validation` | Swervly editorial |
| Specialization | `spec:cfd-simulation` | Swervly editorial |
| Occupation | `occ:onet:17-2141.00` | O*NET-SOC code and title |

Edges are many-to-many and always point one level down, so the graph cannot cycle. `Mechanical Engineers` sits under several specializations; `Robotics Engineers` is reached from engineering and from computing.

## Files

| Path | What |
| --- | --- |
| `src/features/atlas/types.ts` | Ids, levels, provenance, activity tags |
| `src/content/atlas/occupations.ts` | O*NET codes and titles, with the credit line |
| `src/content/atlas/onet-details.ts` | GENERATED: verbatim O*NET content per occupation, plus the Job Zone wording |
| `src/features/atlas/onet-import.ts`, `scripts/atlas-import-onet.ts` | CSV parsing, selection rules, and the import command |
| `src/content/atlas/taxonomy.ts` | Domains, families, specializations (editorial) |
| `src/content/atlas/major-links.ts` | Catalog major → families it commonly opens |
| `src/features/atlas/graph.ts` | Index, parents, children, paths, dismissal visibility |
| `src/features/atlas/entry.ts` | Cold-start entry from a stored major |
| `src/features/atlas/compat.ts` | Existing Direction role → families |
| `src/features/atlas/validate.ts` | Structural checks run by the tests |
| `src/content/atlas/questions.ts` | Preference questions (editorial; ids stable) |
| `src/features/atlas/rank.ts` | Deterministic exploration priorities and next-question choice |
| `src/content/atlas/company-links.ts` | Directory organization → families (editorial; never a hiring claim) |
| `tests/atlas/*` | Data integrity, multi-parent paths, dismissal, privacy, cold start, compat |

## Rules

- **Sourced vs editorial.** Occupation content comes only from the O*NET database CSV files (CC BY 4.0, credit names the release), never from memory or a model. All text is verbatim; Swervly only chooses what to show: the 5 tasks with the highest O*NET Importance; up to 5 skills rated at least 3/5 and more important than in the average occupation (names only, no scores); up to 8 software entries O*NET flags "In Demand" for that occupation, minus common office tools; the Job Zone; and up to 5 "Primary-Short" related occupations. Essential + transferable skills together are what older releases called "Skills". To update: download the CSV database, run `npx tsx scripts/atlas-import-onet.ts <csv folder> <release>`, review the diff. Everything else is labeled `swervly_editorial` and reviewed by a founder.
- **Privacy.** `atlasEntry` never receives `customMajorText`. Custom majors, and legacy rows whose text does not match the catalog, get the open entry. A test checks the text never appears in the output.
- **Undecided and unset** get every domain, alphabetical, unranked. Never engineering by default.
- **Dismissal.** A dismissed node is hidden. A family is blocked when every Direction role mapping to it was dismissed. A node is dimmed when every path to it passes through a dismissed or blocked node, so a career reachable another way stays visible. An explicit Interested always wins. Atlas never writes to `dismissed_career_roles` or `interested_career_roles`; new Atlas ids are prefixed, so they cannot collide with role ids.
- **No fit scores.** Atlas output never shows a percentage, "fit score" or "match".
- **Ranking (Stage C1).** Specializations get small integer points, each with its own reason sentence: +2/+1 for the major's common/sometimes families, +1 per chosen activity (max +3), +1 for an area marked Interested on Direction, +3 for an Interested mark in Atlas. Missing information never subtracts; ties break by id. Top picks take at most 2 per family, and for a major entry the last slot goes outside the major. "Start here" appears only after the student says something beyond their major. Answers, marks and the chosen direction are saved per student (migration 0007 is applied everywhere). If the tables are ever missing, the map falls back to on-screen only.
- **Direction signals (Stage C).** The Atlas page reuses Direction's own output: +1 for an area Direction currently suggests (or that the student marked Interested there; one point, not both) and +1 where Direction has student evidence (at least 2 consenting students with nearby quiz profiles rated that role highly). Evidence is shown at the role level it was measured at, never pushed down to a specialization. Atlas reads no reviews itself.
- **Organizations (Stage C).** Family, specialization and occupation pages list directory organizations whose editorial families overlap, with careers links only from the existing verified allowlist, and say plainly that a listing doesn't mean they're hiring.
- **Compare (Stage C).** Any two occupations side by side: description, top 3 tasks, standout skills, in-demand software, preparation, areas, and what they share.
- **Questions.** The next question is the unanswered one whose smaller side covers the most current options (before any answer: everything the major leads to), so either answer reorders a lot. "Not sure yet" changes nothing; every question can be skipped. Known limit: questions cover kinds of work (build, model, code, data, people, organize, test, field), not topics (robots, vehicles, health); a topic gets in through search and Interested.

## Next

See `docs/career-atlas-stage-d.md`: running migration 0007, updating O*NET, full coverage in batches, and review-level evidence (needs three founder decisions).
Also: topic questions or tags (robots, vehicles, health, energy) so a topic can be asked, not only searched; and turning the map on in production.
