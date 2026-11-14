# Swervly: Profile + Review go-live: Li's runbook

Sat Nov 14, 2026 · Machine: Li's · Lane B (Review)

You do three things today, in order: **prepare content** while Peter builds the foundation (you cannot clone until he pushes it), build **Lane B: Review** on `feat/review` while Peter builds Lane A, then **rebase, test and hand over** for the merge. Peter's runbook is `RUNBOOK_PETER.md`. The "Shared contract" section is word-for-word the same in both.

## 0. Read this first

**What "live today" means here.** By tonight, on a production URL, a UC email can sign in, finish the profile, and log a past co-op with its review, and those rows are in the production database. The two of you are the first users. Inviting friends is a separate gate in Peter's runbook (section 7); your privacy page is part of that gate.

**How the two machines stay out of each other's way.**

- Peter alone builds the foundation on `main`: the skeleton, the full database schema for both lanes, sign-in, shared UI components, and a script that checks lane boundaries. After that, foundation files are frozen.
- You own a fixed list of folders (C1 in the shared contract). Peter owns a different list. No file is on both lists.
- Neither lane installs packages, edits the schema, or imports the other lane's code.
- Your lane reads one thing Peter's lane writes: `users.onboardedAt`. You only ever touch it through `requireOnboardedUser()` and `apiOnboardedUser()`.
- You never push to `main` and never hold production keys.

**Decisions already made for today** (in Peter's runbook, section 0; object before the foundation is pushed, not after): public repo or Vercel Pro so that your commits can deploy; the O\*NET Mini Interest Profiler's 30 items, verbatim, as the interest questions; sign-in by emailed code; the UC email check done in our own code; production at `app.swervly.com`.

**What is cut today** is in C5 of the shared contract. For your lane the important cuts are paste-your-reflection prefill and follow-through matching. Do not let an agent add either.

**Rough clock, from 3:45 pm.** Estimates, not promises.

| When | Li | Peter |
| --- | --- | --- |
| 3:45–4:00 | Section 1 of Peter's runbook together: decisions, accounts, access | same |
| 4:00–5:30 | Content prep (section 1 below) | Foundation |
| 5:30–5:45 | Machine setup and first push (section 2) | Sends dev keys, watches your first deploy |
| 5:45–8:15 | Lane B (section 4) | Lane A |
| 8:15–9:00 | Rebase, fix, test on phone | Merge, production checks |

If you are behind at 7:30, cut the edit screen (`/reviews/[id]/edit` and `PUT`). Keep create, list and delete.

## 1. Content prep while Peter builds the foundation (no repo needed)

Write these as plain text files anywhere outside a repo. Use a chat model to draft if you like, but check every line yourself. No real student data in any prompt.

**P1. The 30 interest items, for Peter. Do this first; he needs it by about 5:30.**
From the O\*NET Mini Interest Profiler source (`https://www.onetcenter.org/dl_files/Mini-IP.pdf`, or O\*NET Web Services), copy into one text file: the 30 item texts in the instrument's order, which of the six scales (R, I, A, S, E, C) each item scores on, the five response labels from lowest to highest, and the credit line required for verbatim use from `https://www.onetcenter.org/license_tools.html`. Copy and paste; do not retype and do not ask a model to recall them. Send the file to Peter, then read all 30 aloud with him against the source.

**P2. Employer seed list.** 40 to 60 employers where you two know UC engineering students co-op, from your own knowledge and from asking friends. For each: the canonical name, the other names students type ("GE", "General Electric" for "GE Aerospace"), industry, city. Do not copy lists out of Handshake, LinkedIn or UC systems; the build plan rules that out.

**P3. Skills list.** 15 to 25 short tags a student could tick for "skills used", broad enough for any CEAS major (for example: Programming, CAD, Circuit design, Testing and validation, Data analysis, Technical writing, Project management, Manufacturing, Field work, Customer contact). Add "Other".

**P4. Privacy policy draft.** Plain language, one page. It must say truthfully: what is collected (UC email, major, year, goals, interest answers, employers, ratings, optional pay, optional free text); why; who can see it today (only the author, plus the two founders through database access); that reviews will later be shown to other UC students without names, pay only as a range across three or more records, and free text only if the author ticked the box; that Swervly is not affiliated with or endorsed by the University of Cincinnati; how to download and delete your data (the Settings page); a contact email. Neither of you is a lawyer and the draft is not legal advice; Peter's section 7 lists the open legal questions.

**P5. `security.txt`.** A contact email and an expiry date about a year out, in the standard `Contact:` / `Expires:` format.

## 2. Machine setup (after Peter says "foundation is on main")

**S1. Clone and install.** Use `npm ci`, not `npm install`, so the lockfile is not rewritten.

```bash
git clone <repo url> swervly && cd swervly
npm ci
cp .env.example .env.local
```

**S2. Keys.** Paste into `.env.local` what Peter sent: the `dev-li` `DATABASE_URL` and the Clerk development keys. Never paste them into an agent or a chat.

**S3. Run and unblock yourself.** `npm run dev`, sign in with your UC email (this creates your `users` row). Onboarding is a stub until Peter's lane merges, so mark yourself onboarded in your own dev database: run `npm run db:studio`, open `users`, set `onboarded_at` on your row to the current time. `/reviews` should now load its stub.

**S4. Branch, first commit, deploy test.**

```bash
git checkout -b feat/review
# create src/content/skills.ts from P3:  export const SKILLS = ["Programming", ...] as const;
npm run check && scripts/check-lane.sh review
git add src/content/skills.ts && git commit -m "Review: skills list" && git push -u origin feat/review
```

Tell Peter you pushed. He confirms in Vercel that your commit deployed. If Vercel blocked it because of who authored the commit, stop: that is the repo-visibility decision, and it has to be fixed before either of you builds more.

## 3. Shared contract (identical in both runbooks; do not edit one copy only)

This section is the agreement between the two lanes. If your agent needs something that contradicts it, stop and message your partner. Do not work around it.

### C1. Who owns which files

| Area | Owner | Paths |
| --- | --- | --- |
| **Foundation (frozen)** | Peter only, on `main` | `package.json`, `package-lock.json`, `*.config.*`, `tsconfig.json`, `.env.example`, `AGENTS.md`, `docs/**`, `drizzle/**`, `scripts/check-lane.sh`, `src/proxy.ts`, `src/db/**`, `src/lib/**`, `src/components/**`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/sign-in/**`, `src/app/sign-up/**`, `src/app/not-eligible/**`, `src/app/(app)/layout.tsx`, `src/app/(app)/home/**`, `src/app/api/me/**` |
| **Lane A: Profile** | Peter, branch `feat/profile` | `src/app/(app)/onboarding/**`, `src/app/(app)/profile/**`, `src/app/(app)/settings/**`, `src/app/api/profile/**`, `src/app/api/assessment/**`, `src/app/api/account/**`, `src/features/profile/**`, `src/content/interest-items.ts`, `tests/profile/**` |
| **Lane B: Review** | Li, branch `feat/review` | `src/app/(app)/reviews/**`, `src/app/api/rotations/**`, `src/app/api/employers/**`, `src/features/review/**`, `src/content/employers-seed.ts`, `src/content/skills.ts`, `src/app/privacy/**`, `public/.well-known/security.txt`, `scripts/seed-employers.ts`, `tests/review/**` |

Rules that keep the lanes apart:

1. A lane branch changes only its own paths. `scripts/check-lane.sh profile` or `scripts/check-lane.sh review` proves it, and must pass before every push.
2. Nobody installs a package on a lane branch. Everything both lanes need is installed in the foundation.
3. Nobody edits the schema or generates a migration on a lane branch.
4. Lanes never import from each other. `src/features/profile/**` and `src/features/review/**` may import only from `src/db`, `src/lib`, `src/components`, `src/content` (own files) and npm packages.
5. Lanes link to each other by URL only, using the fixed routes in C4.
6. One agent session per folder at a time, and only the human runs `git commit` and `git push`.

**Frozen-file change request.** If a lane truly needs a foundation change (a new column, a package, a shared component), message the partner with: the file, the exact change, and why. Peter makes it on `main` in one small commit, runs the migration on all three database branches if the schema changed, and says "main updated". Both then run `git fetch origin && git rebase origin/main`. Expect zero or one of these today; more means the contract was wrong, so talk.

### C2. Database schema (frozen)

File `src/db/schema.ts`. This exact file has been type-checked and run through `drizzle-kit generate` (drizzle-orm 0.45, drizzle-kit 0.31).

```ts
import { sql } from "drizzle-orm";
import {
  boolean, check, index, integer, jsonb, numeric, pgTable, text, timestamp,
  uniqueIndex, uuid, vector,
} from "drizzle-orm/pg-core";

const createdAt = timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: text("clerk_id").notNull().unique(),
  email: text("email").notNull().unique(),
  major: text("major"),                       // one of MAJORS; null until onboarding
  year: integer("year"),                      // 1-5; null until onboarding
  coopTrack: text("coop_track"),              // optional free label
  consentPrivacyAt: timestamp("consent_privacy_at", { withTimezone: true }),
  consentDataUseAt: timestamp("consent_data_use_at", { withTimezone: true }),
  onboardedAt: timestamp("onboarded_at", { withTimezone: true }),
  source: text("source").notNull().default("early"),   // 'early' | 'launch'
  createdAt,
  updatedAt,
}, (t) => [
  check("users_year_range", sql`${t.year} is null or ${t.year} between 1 and 5`),
]);

export const profiles = pgTable("profiles", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  goal: text("goal").notNull(),                               // 'industry' | 'grad_school' | 'undecided'
  goalNotes: text("goal_notes"),
  locationConstraint: text("location_constraint").notNull(),  // 'cincinnati_only' | 'within_drive' | 'anywhere'
  constraintsNotes: text("constraints_notes"),
  profileVector: vector("profile_vector", { dimensions: 30 }),// null until the assessment is saved
  vectorVersion: integer("vector_version"),
  createdAt,
  updatedAt,
});

export const assessments = pgTable("assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  instrument: text("instrument").notNull(),          // 'onet_mini_ip_30'
  rawAnswers: jsonb("raw_answers").$type<Record<string, number>>().notNull(),  // itemId -> 1..5
  scored: jsonb("scored").$type<Record<string, number>>().notNull(),           // R,I,A,S,E,C -> mean 1..5
  takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("assessments_user_taken_idx").on(t.userId, t.takenAt),
]);

export const employers = pgTable("employers", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),                       // canonical display name
  normalizedName: text("normalized_name").notNull(),  // normalizeEmployerName(name)
  aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
  industry: text("industry"),
  city: text("city"),
  status: text("status").notNull().default("pending"),// 'approved' | 'pending'
  createdByUserId: uuid("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt,
}, (t) => [
  uniqueIndex("employers_normalized_name_uq").on(t.normalizedName),
]);

export const rotations = pgTable("rotations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  employerId: uuid("employer_id").notNull().references(() => employers.id, { onDelete: "restrict" }),
  roleTitle: text("role_title").notNull(),
  termSeason: text("term_season").notNull(),          // 'spring' | 'summer' | 'fall'
  termYear: integer("term_year").notNull(),
  rotationNumber: integer("rotation_number").notNull(),
  payHourly: numeric("pay_hourly", { precision: 6, scale: 2 }),  // optional
  returnOffer: text("return_offer").notNull(),        // 'yes' | 'no' | 'pending' | 'not_applicable'
  source: text("source").notNull().default("early"),
  createdAt,
  updatedAt,
}, (t) => [
  uniqueIndex("rotations_user_number_uq").on(t.userId, t.rotationNumber),
  index("rotations_employer_idx").on(t.employerId),
  check("rotations_number_range", sql`${t.rotationNumber} between 1 and 5`),
]);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  rotationId: uuid("rotation_id").notNull().unique().references(() => rotations.id, { onDelete: "cascade" }),
  enjoyment: integer("enjoyment").notNull(),
  learning: integer("learning").notNull(),
  mentorship: integer("mentorship").notNull(),
  clarityGained: integer("clarity_gained").notNull(),
  skillsUsed: text("skills_used").array().notNull().default(sql`'{}'::text[]`),
  freeText: text("free_text"),
  shareFreeText: boolean("share_free_text").notNull().default(false),
  source: text("source").notNull().default("early"),
  createdAt,
  updatedAt,
}, (t) => [
  check("reviews_ratings_range", sql`${t.enjoyment} between 1 and 5 and ${t.learning} between 1 and 5 and ${t.mentorship} between 1 and 5 and ${t.clarityGained} between 1 and 5`),
]);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type Employer = typeof employers.$inferSelect;
export type Rotation = typeof rotations.$inferSelect;
export type Review = typeof reviews.$inferSelect;
```

Notes on the schema:

- Deleting a `users` row cascades to that user's profile, assessments, rotations and reviews. That is how delete-my-account works; Lane B needs no code for it.
- `recommendations`, `plans`, `mentor_optins` and `usage_events` from the build plan are not created today. They are additive later and nothing here blocks them.
- The build plan puts major inside the profile vector. Today the vector holds only the 30 interest answers, and major stays a column that matching filters on. Raw answers are always kept in `assessments`, so the vector can be recomputed under a new `vectorVersion` at any time.

### C3. Shared code the foundation provides (import, never copy or edit)

| Import | What it gives you |
| --- | --- |
| `db` from `@/db` | Drizzle client on the Neon HTTP driver. It has no interactive transactions: for writes that must succeed together, use `db.batch([...])` and generate ids in code with `crypto.randomUUID()`. |
| `* as schema` from `@/db/schema` | Tables and row types from C2. |
| `requireUser()` from `@/lib/auth` | For pages. Returns the `User` row (created on first sight). Redirects to `/sign-in` if signed out, `/not-eligible` if the email is not a UC address. |
| `requireOnboardedUser()` from `@/lib/auth` | Same, plus redirects to `/onboarding` when `onboardedAt` is null. |
| `apiUser()`, `apiOnboardedUser()` from `@/lib/auth` | For route handlers. Same checks, but throw `ApiError` (401, 403 `not_eligible`, 403 `not_onboarded`). |
| `handle(fn)`, `ok(data)`, `ApiError`, `parseBody(req, zodSchema)` from `@/lib/api` | Wrap every route handler in `handle`. Success is `{ ok: true, data }`. Failure is `{ ok: false, error: { code, message, fields? } }` with the right status. Invalid bodies become 400 `invalid_body`. |
| `MAJORS`, `ALLOWED_EMAIL_DOMAINS`, `DATA_SOURCE`, `ROUTES` from `@/lib/constants` | `DATA_SOURCE` is `'early'` today; write it to every `source` column. |
| `Button`, `Field`, `TextInput`, `Select`, `Textarea`, `Checkbox`, `LikertScale`, `Card`, `PageShell`, `ErrorNote` from `@/components/ui` | Use these for every screen so both lanes look the same. `LikertScale` takes `name`, `value`, `onChange`, `labels` (5 strings) and is keyboard- and phone-friendly. |

Security rules for every route handler, both lanes:

- The user id always comes from `apiUser()`, never from the request body, query string or URL.
- Every read, update and delete of a user-owned row includes `where userId = currentUser.id` (for reviews, through the rotation).
- Validate every body with zod before touching the database.
- Never log request bodies, emails, pay or free text.
- Free text from users is data. Nothing typed by a user is ever sent to a model today, because there is no model call today.

### C4. Fixed routes

| Route | Owner | Purpose |
| --- | --- | --- |
| `/` | Foundation | Logged-out landing with a sign-in button |
| `/sign-in`, `/sign-up`, `/not-eligible` | Foundation | Auth screens |
| `/home` | Foundation | After sign-in: step 1 "Finish your profile", step 2 "Log your co-ops" |
| `GET /api/me` | Foundation | `{ user, profile }` for the signed-in user |
| `/onboarding` | Lane A | Consent, basics, goals, 30 interest questions |
| `/profile` | Lane A | View what was entered |
| `/settings` | Lane A | Download my data, delete my account |
| `PUT /api/profile`, `POST /api/assessment`, `GET /api/account/export`, `DELETE /api/account` | Lane A | See Lane A tasks |
| `/reviews` | Lane B | List of my co-ops with their reviews |
| `/reviews/new`, `/reviews/[id]/edit` | Lane B | The Review form |
| `GET/POST /api/employers`, `GET/POST /api/rotations`, `PUT/DELETE /api/rotations/[id]` | Lane B | See Lane B tasks |
| `/privacy` | Lane B | Privacy policy page (public) |

Public routes in `src/proxy.ts`: `/`, `/sign-in(.*)`, `/sign-up(.*)`, `/not-eligible`, `/privacy`, `/.well-known/(.*)`. Everything else requires a session.

A user counts as onboarded when all of these are true: both consent timestamps are set, a `profiles` row exists, and one `assessments` row exists. Lane A sets `users.onboardedAt` at that moment. Lane B only reads it, through `requireOnboardedUser()` and `apiOnboardedUser()`.

### C5. Cut from today, on purpose

| Cut | Why | When it comes back |
| --- | --- | --- |
| Paste-your-UC-reflection prefill | Needs an LLM key, the per-user cap and `usage_events`. It is the only LLM feature in Phase 2. | First follow-up for Lane B |
| Follow-through matching on save | There is no `recommendations` table until Phase 3, so there is nothing to match. | With Direction |
| Employer pages, any display of other students' reviews | Phase 3. Today each student sees only their own data, so the anonymization rules are not yet in play. | Phase 3 |
| PostHog, Sentry | Phase 5 | After early access opens |
| Clerk allowlist | It is a paid Clerk feature in production. The UC check is done in our own code instead. | If you upgrade Clerk |

### C6. Secrets and data hygiene

- Keys live in `.env.local` (git-ignored) and in Vercel's environment variables. Never in the repo, never pasted into Grok, Cursor or any chat.
- Peter sends Li the dev keys once, through a password manager share or another end-to-end encrypted channel. Li never holds production keys.
- No real student data in either working folder, in prompts, or in test fixtures. Use made-up names like "Test Employer A".
- Each person uses their own Neon branch (`dev-peter`, `dev-li`), so test rows never collide and never reach production.

### C7. Definition of done for a lane

1. `npm run check` passes (type-check, lint, unit tests, production build).
2. `scripts/check-lane.sh <lane>` passes.
3. The lane's manual test script in its runbook passes on localhost, on a phone-width window.
4. Branch is rebased on `origin/main` and pushed, and a pull request to `main` is open.
## 4. Lane B: Review (Li, branch `feat/review`)

**Running two agents on one machine without them colliding.** Do task B1 with one agent and commit it. Then run B2 (backend) in one agent and B3 (screens) in the other at the same time: they write to different folders and both import the types from B1. You are the only one who commits. If both agents want the same file, the split is wrong; stop one.

### B1. Types, normalization, seed data (one agent, then commit)

Put your P2 list in front of the agent as text.

```text
Read AGENTS.md and the "Shared contract" in docs/RUNBOOK_LI.md. You are in lane: review.
Create only these files:

src/content/employers-seed.ts — export const EMPLOYERS_SEED: { name: string; aliases: string[];
  industry: string | null; city: string | null }[] from the list I paste below. Do not add any
  employer I did not give you.

src/features/review/normalize.ts — normalizeEmployerName(name): lowercase, trim, replace & with
  "and", remove punctuation, collapse whitespace, then drop one trailing corporate suffix (inc, llc,
  corp, corporation, co, company, ltd). Pure function.

src/features/review/schemas.ts (zod + inferred types)
- EmployerCreateInput: name (2-80 chars), city (optional, max 60), industry (optional, max 60).
- RotationInput: employerId (uuid), roleTitle (2-80), termSeason ('spring'|'summer'|'fall'),
  termYear (int, 2015 to the current year), rotationNumber (int 1-5), payHourly (optional number,
  0-200, at most 2 decimals), returnOffer ('yes'|'no'|'pending'|'not_applicable'),
  review: { enjoyment, learning, mentorship, clarityGained (each int 1-5), skillsUsed (array of
  SKILLS values, max 10, no duplicates), freeText (optional, max 2000), shareFreeText (boolean) }.
  Refine: shareFreeText may be true only when freeText is non-empty after trimming.

tests/review/normalize.test.ts and tests/review/schemas.test.ts (vitest): "GE Aerospace, Inc." and
"ge aerospace" normalize to the same string; "AT&T" and "AT and T" match; ratings of 0 and 6 are
rejected; rotationNumber 6 is rejected; shareFreeText true with empty freeText is rejected; a
termYear next year is rejected; no two entries in EMPLOYERS_SEED share a normalized name, and no
alias normalizes to another entry's name.

Run npm run check and scripts/check-lane.sh review. Do not commit.
```

### B2. Backend (agent 1)

```text
Read AGENTS.md and the "Shared contract" in docs/RUNBOOK_LI.md. You are in lane: review.
Touch only src/app/api/employers/**, src/app/api/rotations/**, src/features/review/server.ts and
scripts/seed-employers.ts. Import schemas and normalize from src/features/review; do not edit them.
Every handler uses handle() and apiOnboardedUser(). The db client has no interactive transactions:
use db.batch for writes that must succeed together and crypto.randomUUID() for ids.

1. GET /api/employers?q= — q trimmed, at least 2 chars, else return []. Return up to 8 employers
   whose normalizedName contains normalizeEmployerName(q) or one of whose aliases matches
   case-insensitively, limited to status 'approved' plus 'pending' rows created by this user.
   Fields: id, name, city. Use parameterized queries only.
2. POST /api/employers — parseBody(EmployerCreateInput). Compute the normalized name. If an employer
   with that normalizedName exists, or one whose aliases normalize to it, return that one (200).
   Otherwise insert with status 'pending' and createdByUserId, return it (201). Handle the unique
   index race by re-selecting.
3. GET /api/rotations — this user's rotations with employer { id, name } and review, ordered by
   rotationNumber.
4. POST /api/rotations — parseBody(RotationInput). 404 'employer_not_found' if the employer does
   not exist or is another user's pending row. In one db.batch insert the rotation and its review,
   both with source = DATA_SOURCE. Map a violation of rotations_user_number_uq to 409
   'rotation_number_taken' with a field error on rotationNumber. Return the created rotation.
5. PUT /api/rotations/[id] — same body. First select the rotation where id = param AND userId =
   current user; 404 if none. Batch-update rotation and review, set updatedAt.
6. DELETE /api/rotations/[id] — same ownership check; delete the rotation (the review cascades).
7. scripts/seed-employers.ts — reads DATABASE_URL from the environment (load .env.local with dotenv
   if present), upserts every EMPLOYERS_SEED entry by normalizedName with status 'approved',
   updating aliases, industry and city. Safe to run twice. Prints how many were inserted and updated.

Run npm run check and scripts/check-lane.sh review. Do not commit.
```

### B3. Screens (agent 2, same time as B2)

Put your P4 and P5 text in front of the agent.

```text
Read AGENTS.md and the "Shared contract" in docs/RUNBOOK_LI.md. You are in lane: review.
Touch only src/app/(app)/reviews/**, src/features/review/components/**, src/app/privacy/** and
public/.well-known/security.txt. Use src/components/ui for every control. Call the API routes
described in section 4 task B2 of the runbook; assume they exist and return { ok, data | error }.

1. /reviews — server page, requireOnboardedUser(). Lists the user's co-ops as cards: employer, role,
   term, rotation number, the four ratings, Edit and Delete (Delete asks for confirmation). Empty
   state: "Log your first co-op" with one button. A user with no completed co-op sees "Nothing to
   review yet. Come back after your first rotation."
2. One shared form component used by /reviews/new and /reviews/[id]/edit, built to be finished in
   under five minutes on a phone:
   - Employer: text input with suggestions from GET /api/employers, debounced 250 ms. If nothing
     fits: "Can't find it? Add '<typed text>'" which calls POST /api/employers and selects the result.
   - Role title; term season and year; rotation number, preselected to the lowest number the user
     has not used.
   - Hourly pay, optional, with the helper text "Optional. Only ever shown as a range across three
     or more students, never on its own."
   - Return offer: Yes / No / Don't know yet / Not applicable.
   - Four LikertScale questions, 1 to 5: "How much did you enjoy the work?" (Not at all … Loved it),
     "How much did you learn?" (Very little … A great deal), "How good was the mentorship?"
     (None … Excellent), "Did this co-op make it clearer what you want next?" (Not at all … Much clearer).
   - Skills used: tappable chips from SKILLS.
   - Free text, optional: "Anything a student considering this co-op should know?" and a checkbox,
     off by default: "It's OK to show this text to other UC students without my name."
   Show field errors from the API next to the field, including rotation_number_taken. Disable the
   submit button while saving. On success go to /reviews.
3. /privacy — a public static page with the policy text I paste below, readable on a phone, with a
   "Last updated" date. public/.well-known/security.txt with the text I paste below.

Run npm run check and scripts/check-lane.sh review. Do not commit.
```

### B4. Your manual test (localhost, browser at 375px wide)

1. Seed your dev database: `npx tsx scripts/seed-employers.ts`. Run it twice; the second run inserts nothing.
2. Log a co-op from a seeded employer, typing an alias (for example "GE"): the canonical employer is suggested. Time yourself; under five minutes.
3. Add an employer that is not in the list, then log a second co-op at it. In `db:studio`: the employer is `pending`, there are two `rotations` and two `reviews`, and every `source` is `early`.
4. Try to reuse rotation number 1: the form shows the error on that field and nothing is saved.
5. Edit a review and delete a co-op: the list updates and the review row is gone with its rotation.
6. Ownership: copy a rotation id, sign in as a second test user, and call `PUT` and `DELETE` on that id (browser dev tools or `curl` with the second user's cookie). Both must return 404 and change nothing. Do this one yourself; do not take the agent's word for it.
7. Set your `onboarded_at` back to empty in `db:studio`: `/reviews` redirects to `/onboarding`, and `POST /api/rotations` returns 403 `not_onboarded`. Set it again afterwards.
8. `/privacy` and `/.well-known/security.txt` open without signing in.

Then: `npm run check && scripts/check-lane.sh review`, commit, `git fetch origin && git rebase origin/main`, push, open the pull request, and tell Peter.

## 5. Staying in sync during the build

- Check in every 45 minutes, three lines each: done, next, blocked.
- Any contract question goes to Peter the moment it comes up, not at the next check-in.
- If you need a foundation change, send a frozen-file change request (C1) and keep working on something else in your lane until Peter says "main updated", then `git fetch origin && git rebase origin/main`.
- Have the second model review, not co-write: when a task is done, give the diff to the agent that did not write it and ask for bugs, missing `userId` filters, and anything outside the lane.

## 6. Merge and go live (your part)

1. Read Peter's pull request while he reads yours. Look hardest at `src/app/api/account/**` (delete and export) and at how `onboardedAt` gets set.
2. If Peter's lane merges first, rebase on `origin/main`, run `npm run check`, and push again. If the lane guard passed on both branches, there are no conflicts.
3. After both merges, Peter seeds production employers with your script and his production credentials.
4. Production test on your phone with your real UC email: sign in, do the real onboarding (your dev shortcut does not exist there), log one real past co-op, download your data from Settings.
5. Report anything wrong to Peter; he can roll production back to the previous deployment in Vercel while it is fixed on a branch.

## 7. Next for this lane, after today

Paste-your-UC-reflection prefill: a model reads the pasted text and proposes form values, the student confirms before anything saves, the pasted text sits in a separate labelled part of the prompt, the output is schema-validated, and the per-user daily cap and `usage_events` table ship with it. Then follow-through matching, once Direction creates recommendations.
