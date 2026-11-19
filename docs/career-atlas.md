# Career Atlas

Status: B1 (data, graph, tests) is on `main`. B2 adds the `/direction/atlas` drill-down (off in production) and O*NET 31.0 content: descriptions, top tasks, standout skills, in-demand software, Job Zone and related occupations. No table, no migration.

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
| `tests/atlas/*` | Data integrity, multi-parent paths, dismissal, privacy, cold start, compat |

## Rules

- **Sourced vs editorial.** Occupation content comes only from the O*NET database CSV files (CC BY 4.0, credit names the release), never from memory or a model. All text is verbatim; Swervly only chooses what to show: the 5 tasks with the highest O*NET Importance; up to 5 skills rated at least 3/5 and more important than in the average occupation (names only, no scores); up to 8 software entries O*NET flags "In Demand" for that occupation, minus common office tools; the Job Zone; and up to 5 "Primary-Short" related occupations. Essential + transferable skills together are what older releases called "Skills". To update: download the CSV database, run `npx tsx scripts/atlas-import-onet.ts <csv folder> <release>`, review the diff. Everything else is labeled `swervly_editorial` and reviewed by a founder.
- **Privacy.** `atlasEntry` never receives `customMajorText`. Custom majors, and legacy rows whose text does not match the catalog, get the open entry. A test checks the text never appears in the output.
- **Undecided and unset** get every domain, alphabetical, unranked. Never engineering by default.
- **Dismissal.** A dismissed node is hidden. A family is blocked when every Direction role mapping to it was dismissed. A node is dimmed when every path to it passes through a dismissed or blocked node, so a career reachable another way stays visible. An explicit Interested always wins. Atlas never writes to `dismissed_career_roles` or `interested_career_roles`; new Atlas ids are prefixed, so they cannot collide with role ids.
- **No fit scores.** Atlas output never shows a percentage, "fit score" or "match".

## Next

1. Done in B2: `/direction/atlas` drill-down behind a prototype flag, occupation detail, browser-only marks, a "See careers in this area" link from Direction.
3. Stage C (separate approval): deterministic ranking and preference questions; persistent marks need a migration.
