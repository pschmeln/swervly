# Career Atlas: Stage D (persistence and scale)

Status: persistence is built and tested; the migration has **not** been applied to any Neon branch. Full coverage and review-level evidence are designed here and not built.

## 1. Saved choices (built)

### Tables (migration `drizzle/0007_career_atlas_marks.sql`)

| Table | Key | Columns | Rules |
| --- | --- | --- | --- |
| `career_atlas_marks` | (`user_id`, `node_id`) | `mark` text, `created_at`, `updated_at` | `mark` ∈ interested, dismissed, pursuing. `node_id` must match an Atlas id shape (`dom:`/`fam:`/`spec:` slug or `occ:onet:NN-NNNN.NN`). At most one `pursuing` row per student (partial unique index). |
| `career_atlas_answers` | (`user_id`, `question_id`) | `answer` text, `created_at`, `updated_at` | `answer` ∈ a, b, both, unsure. `question_id` is a lowercase slug. |

Both reference `users.id` with `ON DELETE CASCADE`, so delete-my-account removes them. Both are in the account export (`careerAtlas.marks`, `careerAtlas.answers`). The migration is additive: no existing row or column changes.

Why rows instead of more `text[]` columns on `users`: the existing `dismissed_career_roles` / `interested_career_roles` arrays hold Direction role ids and stay untouched. Atlas ids are a different namespace and grow with the map; rows keep one mark per node, enforce one direction per student in the database, and keep `users` narrow.

### Code

| Path | What |
| --- | --- |
| `src/features/atlas/server.ts` | `loadAtlasState`, `saveMark`, `saveAnswer`, `clearAnswers`, zod inputs. Every query filters by the caller's `users.id`. Unknown ids or questions are refused before the database. |
| `src/app/api/atlas/marks/route.ts` | `PUT { nodeId, mark | null }` |
| `src/app/api/atlas/answers/route.ts` | `PUT { questionId, answer | null }`, `DELETE` (clear all) |
| `src/app/(app)/direction/atlas/page.tsx` | Loads saved state; if the tables are missing it passes `available: false` and the map stays on-screen only. |
| `src/features/profile/server.ts` | Export includes Atlas rows; read separately so a database without 0007 still exports everything else. |
| `src/app/privacy/page.tsx` | States what the career map stores and how it's used. |

"Make this my direction" is the brief's *explicit user-selected direction*: one per student, pinned at the top of the map, clearing it keeps the career as Interested, and it hides nothing else.

### Tests

- `tests/atlas/stage-d.test.ts`: the real Drizzle queries through `drizzle-orm/pg-proxy`; every statement on Atlas tables carries the signed-in user's id and never another's, even when the body names one; bad input never reaches the database; load drops ids no longer in the map; missing tables fall back cleanly; migration is additive and its id check accepts every real Atlas id.
- Real Postgres check (PGlite, outside the repo): the migration applied in one transaction; upsert, one-direction-per-student, demote-then-set, every check constraint, foreign key, and cascade on user delete all behaved as intended (17/17).

### Running the migration (humans only)

Follow "Keeping the test databases in step" in `docs/RUNBOOK.md`. For each branch, in this order, with that branch's `DATABASE_URL` exported in a throwaway shell:

1. `dev-peter`, then `dev-li`: `npm run db:migrate`. Previews start saving choices.
2. **production**: `npm run db:migrate`.
3. Merge the pull request.

`db:migrate` records the file's sha256 and the journal `when` (`1795500000000`). Merging before step 2 is safe: the map is off in production and every Atlas read degrades to on-screen only, but saves will fail with a visible "Couldn't save" note until the tables exist.

## 2. Career data updates (built)

O*NET publishes new releases a few times a year (this map uses **31.0, August 2026**). To update:

1. Download the CSV database from https://www.onetcenter.org/database.html and unzip it.
2. `npx tsx scripts/atlas-import-onet.ts <folder> <release>` (reads nine CSVs, writes `src/content/atlas/onet-details.ts`).
3. If it reports codes with no description or tasks, O*NET changed its taxonomy: fix `src/content/atlas/occupations.ts` first. It never invents content to fill a gap.
4. Run `scripts/preflight.sh`, read the diff of `onet-details.ts`, and open a PR.

The credit line takes the release number from the generated file, so it can't drift.

## 3. Organizations (built at family level)

`src/content/atlas/company-links.ts` maps directory organizations to families. Occupation-level links are deliberately not built: nothing in Swervly's data says an organization employs a given occupation, and "listed under this area" is the strongest claim the data supports. When the Phase 3A.1 directory expansion lands, each new organization needs a row there; a test already checks every key is a real directory id with only allowlisted links.

## 4. Full occupational coverage (designed, not built)

O*NET 31.0 has 1,016 occupations; the map has 54. Importing all of them blindly would bury students and break the editorial layer (every occupation must sit under a specialization a person wrote). Plan:

1. **Coverage report.** Extend the import script with `--report`: for each catalog major, list O*NET occupations whose Job Zone is 4–5 and whose related occupations already include a mapped occupation, ranked by how many mapped neighbors they have. This finds the next most useful 50, not the next alphabetical 50.
2. **Batches of 25–50**, each a PR: add rows to `occupations.ts`, attach each to an existing or new specialization in `taxonomy.ts`, re-run the import. The validator already refuses an orphan.
3. **Search beyond the map.** For occupations still unmapped, search can show "Also in O*NET" results linking to O*NET OnLine, labeled as outside Swervly's map. No editorial claims about them.
4. **Stop rule.** Coverage is "done" when every catalog major's first screen has at least four families with at least two specializations each. More is not automatically better for students.

## 5. Evidence-based ranking (designed, not built)

Today Atlas reuses Direction's evidence: role-level, consenting students, n ≥ 2, nearby quiz profiles. That can't separate CFD from robotics because reviews only record a broad `role_type` (Fatal 1 in the Stage A doc).

### Future schema

| Change | Type | Notes |
| --- | --- | --- |
| `rotations.atlas_node_id` | nullable text, same check as `career_atlas_marks.node_id` | Optional "closest career" pick on the review form (specialization or occupation). Null for every existing review. |
| `reviews.atlas_fit` | none | Not added. Enjoyment, learning and "would you go back" already exist; Atlas reads those. |
| `career_atlas_evidence` (view or nightly table) | (`node_id`, `level`, `students`, `mean_enjoyment`, `computed_at`) | Aggregates consenting reviews per node and rolls up to the parent specialization and family. Rows with `students < 2` are never stored. |

### Rules

- Evidence is shown at the **finest level that reaches 2 distinct consenting students**, and labeled with that level ("2 students in CFD simulation co-ops" vs "3 students in Simulation and Validation co-ops"). Never pushed down to a child it didn't observe.
- Consent: the existing versioned review-sharing consent covers "Direction evidence". Before using `atlas_node_id`, decide whether the consent text needs to name the career map. If it changes, bump `SHARE_REVIEWS_CONSENT_VERSION` so students are asked again.
- Ranking: replace the flat +1 with +1 (family) or +2 (specialization/occupation), still capped and still never shown as a number.
- Scale: compute aggregates once (nightly or on review save) instead of scanning every assessment and review per page load, as `loadDirection` does today. That also fixes Direction's own scaling problem.

### Decisions this needs from the founders

1. Add the optional "closest career" pick to the review form?
2. Does the review-sharing consent need a new version to cover career-map evidence?
3. Nightly job (needs a scheduler) or update-on-save (simpler, slightly slower saves)?
