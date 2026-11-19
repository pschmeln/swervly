# Career Atlas

Status: Stage B1 (static data, graph functions, tests). No screen, no route, no table, no migration. Direction and Explore are unchanged.

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
| `src/content/atlas/occupations.ts` | O*NET codes and titles only, checked on O*NET OnLine 2026-11-18, with the credit line |
| `src/content/atlas/taxonomy.ts` | Domains, families, specializations (editorial) |
| `src/content/atlas/major-links.ts` | Catalog major → families it commonly opens |
| `src/features/atlas/graph.ts` | Index, parents, children, paths, dismissal visibility |
| `src/features/atlas/entry.ts` | Cold-start entry from a stored major |
| `src/features/atlas/compat.ts` | Existing Direction role → families |
| `src/features/atlas/validate.ts` | Structural checks run by the tests |
| `tests/atlas/*` | Data integrity, multi-parent paths, dismissal, privacy, cold start, compat |

## Rules

- **Sourced vs editorial.** Occupations store only O*NET code and title. Descriptions, tasks and skills come later from the O*NET database text files (CC BY 4.0, credit with the release number), never from memory or a model. Everything else is labeled `swervly_editorial` and reviewed by a founder.
- **Privacy.** `atlasEntry` never receives `customMajorText`. Custom majors, and legacy rows whose text does not match the catalog, get the open entry. A test checks the text never appears in the output.
- **Undecided and unset** get every domain, alphabetical, unranked. Never engineering by default.
- **Dismissal.** A dismissed node is hidden. A family is blocked when every Direction role mapping to it was dismissed. A node is dimmed when every path to it passes through a dismissed or blocked node, so a career reachable another way stays visible. An explicit Interested always wins. Atlas never writes to `dismissed_career_roles` or `interested_career_roles`; new Atlas ids are prefixed, so they cannot collide with role ids.
- **No fit scores.** Atlas output never shows a percentage, "fit score" or "match".

## Next

1. B2: `/direction/atlas` drill-down behind a prototype flag, occupation detail, browser-only marks, a "See careers in this area" link from Direction.
2. Import O*NET descriptions, tasks and skills from the downloaded text files.
3. Stage C (separate approval): deterministic ranking and preference questions; persistent marks need a migration.
