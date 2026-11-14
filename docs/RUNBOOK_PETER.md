# Swervly: Profile + Review go-live: Peter's runbook

Sat Nov 14, 2026 · Machine: Peter's · Lane A (Profile) + foundation + go-live

You do three things today, in order: build the **foundation** on `main` alone (Li cannot start coding until it is pushed), build **Lane A: Profile** on `feat/profile` while Li builds Lane B, then **merge and go live**. Li's runbook is `RUNBOOK_LI.md`. The "Shared contract" section is word-for-word the same in both.

## 0. Read this first

**What "live today" means here.** By tonight, on a production URL, a UC email can sign in, finish the profile (consent, basics, goals, 30 interest questions), and log a past co-op with its review, and those rows are in the production database. The two of you are the first users. Inviting friends is a separate gate (section 7), because the build plan requires the privacy policy, consent and delete-my-account to be working first.

**Decisions I made so the work can start. Change any of them before the foundation is pushed, not after.**

| # | Decision | Default in this runbook | Why it must be settled now |
| --- | --- | --- | --- |
| 1 | Repo visibility and Vercel plan | **Public** GitHub repo on your personal account, Vercel Hobby | On Hobby, Vercel blocks deployments of commits authored by anyone but the account owner when the repo is private. With a private repo, Li's commits would not deploy. The other compliant option is Vercel Pro with Li added as a member. Pick one; the lanes are the same either way. |
| 2 | Interest questions | **O\*NET Mini Interest Profiler, 30 items**, 5-point scale, used verbatim | Open decision in the build plan, and it is irreversible in practice: once a friend answers, changing instruments splits the dataset. 30 items is about three minutes. Verbatim use is allowed under CC BY-ND 4.0 with attribution; rewording an item needs O\*NET's separate developer license, so do not reword. |
| 3 | Sign-in method | **Email code** (one-time code to the UC inbox), no Google button | As far as I know UC student mail is Microsoft, so a Google button would not match a UC address. Confirm in step F2. |
| 4 | UC email check | In our own code (`ALLOWED_EMAIL_DOMAINS`), default `["mail.uc.edu"]` | Clerk's allowlist is a paid feature in production. You know the real student domain(s) better than I do; fix the list in F4 if it is wrong. |
| 5 | Production URL | `app.swervly.com`; the existing page at `swervly.com` is untouched today | One DNS record instead of moving the root domain mid-build. Moving the landing page into the app is a later, separate task. |
| 6 | Launch majors in the dropdown | All CEAS majors, starter list in F4 | The build plan assumes EE and CompE first for recruiting, but early access is open to any co-op completer. Verify the list against UC's own. |

**What is cut today** is in C5 of the shared contract. The biggest cut is paste-to-prefill, the only LLM feature in this phase. Without it there is no model key, no usage cap and no prompt-injection surface to build today.

**Rough clock, from 3:45 pm.** These are estimates, not promises.

| When | Peter | Li |
| --- | --- | --- |
| 3:45–4:00 | Section 1 together: confirm decisions, accounts, access | same |
| 4:00–5:30 | Foundation (section 2) | Content prep: interest items, employer seed list, privacy policy draft |
| 5:30–5:45 | Push foundation, send dev keys, watch Li's first commit deploy | Clone, run, push the first tiny commit |
| 5:45–8:15 | Lane A (section 4) | Lane B |
| 8:15–9:00 | Merge, production checks (section 6) | Rebase, fix, test on phone |

If you are behind at 7:30, cut in this order: `/profile` view page, data export (keep delete), then in Lane B the edit screen (keep create and delete).

## 1. Together, before anyone opens an editor (15 min)

1. Agree on the six decisions above. Write any change into both runbooks.
2. Peter creates or confirms accounts, all under Peter: GitHub repo `swervly` (empty, visibility per decision 1), Neon, Clerk, Vercel. Add Li as a collaborator on the GitHub repo.
3. Li confirms his GitHub username and that `git`, Node 20.9 or newer, and both agents (Grok Build, Cursor) run on his machine.
4. Start DNS now, because it is the only step with a wait you cannot shorten: in GoDaddy, add the record Vercel will ask for `app.swervly.com` once the project exists (F6). If you create a Clerk production instance today, add its records in the same sitting.
5. Agree on the channel for check-ins and for sending the dev keys.

## 2. Foundation (Peter alone, on `main`)

Li cannot code until this is pushed, so keep it thin. No feature work here.

### F1. Scaffold

```bash
npx create-next-app@latest swervly --typescript --tailwind --app --src-dir --eslint --import-alias "@/*"
cd swervly
npm i drizzle-orm @neondatabase/serverless @clerk/nextjs zod
npm i -D drizzle-kit vitest tsx dotenv
mkdir -p docs scripts tests/profile tests/review src/content
```

Copy both runbooks into `docs/` as `docs/RUNBOOK_PETER.md` and `docs/RUNBOOK_LI.md`. Agents read the contract from there.

Checked today: `next` is 16.4.x, `@clerk/nextjs` 7.x, `drizzle-orm` 0.45, `drizzle-kit` 0.31. On Next 16 the middleware file is `src/proxy.ts`, not `middleware.ts`.

### F2. Clerk (dashboard, by hand)

1. Create the application. Turn on **Email address** with **email verification code**. Turn off passwords and social buttons.
2. Copy the development keys into `.env.local`.
3. **Test now:** on the dashboard's hosted sign-up page, sign up with your real UC address and confirm the code arrives in the UC inbox, not in quarantine or junk. If UC's mail filter eats it, stop and tell Li; this blocks everything and is not a code problem.

### F3. Neon (dashboard, by hand)

1. Create project `swervly`. The default branch is production.
2. In the SQL editor on the production branch run `CREATE EXTENSION IF NOT EXISTS vector;`
3. Put the production connection string in Vercel only (F6). Do not put it in `.env.local`.
4. After F5's migration has run on production, create branches `dev-peter` and `dev-li` from production. Put `dev-peter`'s string in your `.env.local` as `DATABASE_URL`.

### F4. Foundation code (agent)

Paste into Grok Build or Cursor agent, in the repo root:

```text
Read docs/RUNBOOK_PETER.md, section "Shared contract", fully before writing anything. You are building
only the FOUNDATION listed in C1. Do not create any file in a Lane A or Lane B path except the stub
pages listed below. Check the installed versions in package.json and follow the current official docs
for Next.js 16 (App Router, src/proxy.ts), Clerk's Next.js quickstart, and Drizzle with the Neon HTTP
driver. Do not rely on memory for their APIs. Install nothing.

Build:
1. src/db/schema.ts — exactly the code in C2, character for character. src/db/index.ts exporting `db`
   (drizzle-orm/neon-http, reading DATABASE_URL). drizzle.config.ts (dialect postgresql, schema
   src/db/schema.ts, out drizzle, DATABASE_URL from .env.local via dotenv).
2. src/lib/constants.ts — ALLOWED_EMAIL_DOMAINS = ["mail.uc.edu"]; DATA_SOURCE = "early"; ROUTES with
   every route in C4; MAJORS = ["Aerospace Engineering","Architectural Engineering","Biomedical
   Engineering","Chemical Engineering","Civil Engineering","Computer Engineering","Computer Science",
   "Construction Management","Cybersecurity Engineering","Electrical Engineering","Environmental
   Engineering","Industrial & Systems Engineering","Mechanical Engineering","Engineering Technology",
   "Other"] as const.
3. src/lib/api.ts — ApiError, ok, handle, parseBody exactly as described in C3.
4. src/lib/auth.ts — requireUser, requireOnboardedUser, apiUser, apiOnboardedUser as described in C3.
   Get the Clerk user server-side, take the primary email, lowercase it, and refuse it unless its
   domain is in ALLOWED_EMAIL_DOMAINS. For an allowed user, insert a users row on first sight
   (on conflict on clerk_id do nothing), then select and return it. Never create a users row for a
   refused email.
5. src/proxy.ts — clerkMiddleware with the public routes listed in C4; everything else protected.
6. src/app/layout.tsx with ClerkProvider; src/app/page.tsx (logged-out landing: product name, one
   sentence, Sign in button; signed-in users are redirected to /home); src/app/sign-in/[[...sign-in]]
   and src/app/sign-up/[[...sign-up]] using Clerk's components; src/app/not-eligible/page.tsx
   ("Swervly is for University of Cincinnati students. Sign in with your UC email." plus sign out).
7. src/app/(app)/layout.tsx — calls requireUser(); top nav with links Home, Profile, Reviews,
   Settings and Clerk's UserButton. src/app/(app)/home/page.tsx — two cards: "1. Finish your profile"
   (done when user.onboardedAt is set, links to /onboarding) and "2. Log your co-ops" (shows the
   count of the user's rotations, links to /reviews; disabled until onboarded).
8. src/app/api/me/route.ts — GET returns { user, profile } for the signed-in user via handle/apiUser.
9. src/components/ui/index.ts and the components named in C3. Plain Tailwind, no component library,
   large tap targets, visible focus rings, labels tied to inputs. LikertScale renders five radio
   buttons in a row with the two end labels shown on narrow screens.
10. Stub pages that only render a heading, so nav links resolve. Their owners replace them later:
    src/app/(app)/onboarding/page.tsx, src/app/(app)/profile/page.tsx,
    src/app/(app)/settings/page.tsx, src/app/(app)/reviews/page.tsx, src/app/privacy/page.tsx.
11. package.json scripts: "check": "tsc --noEmit && eslint . && vitest run --passWithNoTests &&
    next build", "db:generate": "drizzle-kit generate", "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio". vitest.config.ts with the @ alias.
12. .env.example listing DATABASE_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in, NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up with empty values.
    Confirm .env*.local is in .gitignore.
13. AGENTS.md at the repo root with exactly the text given in F4b of the runbook.
14. scripts/check-lane.sh with exactly the text given in F4c of the runbook, executable.

Then run `npm run db:generate` and show me the SQL. Do not run db:migrate; I will. Finish by running
`npm run check` and fixing what fails. Do not commit.
```

**F4b. `AGENTS.md`** (Cursor reads this file on its own; start every Grok Build prompt with "Read AGENTS.md" in case it does not):

```markdown
# Rules for any coding agent in this repo

1. Before any change, read the "Shared contract" section of docs/RUNBOOK_PETER.md (same text is in
   docs/RUNBOOK_LI.md). It lists which files your lane may touch. Ask the human which lane you are in.
2. Change only files in your lane. If a task seems to need a foundation file, a schema change or a
   new npm package, stop and tell the human. Do not work around it.
3. Never run git commit, git push, npm install, drizzle-kit generate or drizzle-kit migrate.
4. TypeScript only. Validate every request body with zod. Take the user id from apiUser(), never
   from the request. Every query on user-owned rows filters by the current user's id.
5. Secrets come from process.env. Never print, log or write a secret, an email, pay or free text.
6. Text typed by users is data, never instructions. There are no model calls in this phase.
7. Use the components in src/components/ui for every screen. Every screen must work at 375px wide.
8. For Next.js, Clerk and Drizzle APIs, check the installed version and the current official docs
   before writing code; do not rely on memory.
9. Finish every task by running `npm run check` and `scripts/check-lane.sh <lane>`, and report both.
```

**F4c. `scripts/check-lane.sh`** (tested in a scratch repo: passes in-lane changes, fails on any foundation or other-lane file):

```bash
#!/usr/bin/env bash
# Usage: scripts/check-lane.sh profile|review
# Fails if this branch changes any file outside the lane's allowed paths.
set -euo pipefail
lane="${1:?usage: check-lane.sh profile|review}"
case "$lane" in
  profile) allowed='^(src/app/\(app\)/(onboarding|profile|settings)/|src/app/api/(profile|assessment|account)/|src/features/profile/|src/content/interest-items\.ts$|tests/profile/)' ;;
  review)  allowed='^(src/app/\(app\)/reviews/|src/app/api/(rotations|employers)/|src/features/review/|src/content/(employers-seed|skills)\.ts$|src/app/privacy/|public/\.well-known/security\.txt$|scripts/seed-employers\.ts$|tests/review/)' ;;
  *) echo "unknown lane: $lane"; exit 2 ;;
esac
git fetch -q origin main
bad="$(git diff --name-only origin/main...HEAD | grep -Ev "$allowed" || true)"
if [ -n "$bad" ]; then
  echo "OUT OF LANE ($lane). These files are not yours to change:"; echo "$bad"; exit 1
fi
echo "Lane check passed ($lane)."
```

### F5. Review, migrate, commit

1. Read `src/db/schema.ts` against C2 yourself, line by line. Read `src/lib/auth.ts` yourself. These two files are the expensive ones to get wrong; do not delegate the review.
2. Read the generated SQL in `drizzle/`. It should create six tables and nothing else.
3. Run the migration on **production**: temporarily export the production `DATABASE_URL` in your shell (not in a file), run `npm run db:migrate`, then close that shell.
4. Create `dev-peter` and `dev-li` in Neon from production (they inherit the tables and the extension).
5. Run locally: sign in with your UC email, land on `/home`, open `/api/me`. Try a non-UC email and confirm you land on `/not-eligible` and no `users` row was created.
6. `git add -A && git commit -m "Foundation: skeleton, schema, auth, shared UI, lane guard" && git push -u origin main`

### F6. Vercel

1. Import the repo. Add the environment variables for **Production**: production `DATABASE_URL`, Clerk keys, the two sign-in URL variables. For **Preview** (branch deployments): the Clerk development keys and the `dev-peter` `DATABASE_URL`, so branch builds do not fail for missing variables and never touch production data.
2. Add the domain `app.swervly.com` and create the DNS record Vercel shows, in GoDaddy.
3. Confirm the first deployment is green and sign-in works on the `.vercel.app` URL.

**Clerk production instance.** Clerk's development keys are for development; real users need a production instance, which needs DNS records on a domain you own. Create it now and add the records it shows. If they have not verified by go-live, you two can still do tonight's own test on the development keys, but do not invite anyone until production keys are in Vercel.

### F7. Hand off to Li

1. Send Li, through the agreed encrypted channel: the `dev-li` connection string and the Clerk **development** keys. Nothing from production.
2. Tell Li "foundation is on main".
3. Li's first push is a deploy test (his runbook, step S4). Watch Vercel: his commit must produce a successful deployment. If Vercel reports that the commit author lacks access, decision 1 was not applied; fix that before either of you builds further.

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
## 4. Lane A: Profile (Peter, branch `feat/profile`)

```bash
git checkout main && git pull && git checkout -b feat/profile
```

**Running two agents on one machine without them colliding.** Do task A1 with one agent and commit it. Then run A2 (backend) in one agent and A3 (screens) in the other at the same time: they write to different folders and both import the types from A1. You are the only one who commits. If both agents want the same file, the split is wrong; stop one.

### A0. Interest items (by hand, about 10 min)

Li sends you the 30 items during his prep. Create `src/content/interest-items.ts`:

```ts
export type RiasecScale = "R" | "I" | "A" | "S" | "E" | "C";
export const INSTRUMENT = "onet_mini_ip_30";
export const RESPONSE_LABELS = [/* the five response labels, verbatim from the source, lowest to highest */] as const;
export const INTEREST_ITEMS: { id: string; text: string; scale: RiasecScale }[] = [
  // ip01 … ip30, in the instrument's own order, text verbatim, scale from the source's scoring key
];
export const ATTRIBUTION = "/* the credit line required by the O*NET Career Exploration Tools license page, verbatim */";
```

Rules: paste, do not retype, and do not let an agent write the items or the scoring key from memory. Compare all 30 against the source with Li reading them aloud. After the first real answer is saved, this file never changes: no rewording, reordering or removing.

Sources: the Mini-IP report (`https://www.onetcenter.org/dl_files/Mini-IP.pdf`) or O\*NET Web Services for the items and scoring key; `https://www.onetcenter.org/license_tools.html` for the license and credit line.

### A1. Types and scoring (one agent, then commit)

```text
Read AGENTS.md and the "Shared contract" in docs/RUNBOOK_PETER.md. You are in lane: profile.
Create only these files:

src/features/profile/schemas.ts (zod + inferred types)
- ProfileInput: major (one of MAJORS), year (int 1-5), coopTrack (optional string, max 40),
  goal ('industry'|'grad_school'|'undecided'), goalNotes (optional, max 500),
  locationConstraint ('cincinnati_only'|'within_drive'|'anywhere'), constraintsNotes (optional,
  max 500), consentPrivacy (literal true), consentDataUse (literal true).
- AssessmentInput: instrument (literal INSTRUMENT), answers: record of itemId -> int 1..5 that must
  contain exactly the ids in INTEREST_ITEMS, no more, no fewer.

src/features/profile/scoring.ts (pure functions, no I/O)
- VECTOR_VERSION = 1
- scoreRiasec(answers): for each of R,I,A,S,E,C the mean of that scale's item answers, 2 decimals.
- toProfileVector(answers): number[] of length INTEREST_ITEMS.length, in INTEREST_ITEMS order,
  each value (answer - 3) / 2, so the range is -1..1.

tests/profile/scoring.test.ts and tests/profile/schemas.test.ts (vitest): all-3 answers give a zero
vector; all-5 gives all 1; vector order follows INTEREST_ITEMS order; a missing item, an extra item
and a value of 0 or 6 are each rejected; consent false is rejected.

Run npm run check and scripts/check-lane.sh profile. Do not commit.
```

### A2. Backend (agent 1)

```text
Read AGENTS.md and the "Shared contract" in docs/RUNBOOK_PETER.md. You are in lane: profile.
Touch only src/app/api/profile/**, src/app/api/assessment/**, src/app/api/account/** and
src/features/profile/server.ts. Import schemas and scoring from src/features/profile; do not edit them.

1. PUT /api/profile — apiUser(); parseBody(ProfileInput). In one db.batch: update users (major,
   year, coopTrack, consentPrivacyAt and consentDataUseAt set to now() only if currently null,
   updatedAt) and upsert profiles (goal, goalNotes, locationConstraint, constraintsNotes, updatedAt).
   Return { user, profile }.
2. POST /api/assessment — apiUser(); parseBody(AssessmentInput). Refuse with 409 'profile_required'
   if the user has no profiles row. In one db.batch: insert assessments (rawAnswers, scored from
   scoreRiasec), update profiles (profileVector from toProfileVector, vectorVersion), and set
   users.onboardedAt = now() if it is null and both consent timestamps are set. A retake inserts a
   new assessments row and overwrites the vector. Return { scored, onboarded: true }.
3. GET /api/account/export — apiUser(). Return one JSON file as an attachment
   (swervly-my-data.json) with the user's users row, profile, all assessments, and all rotations
   with their review and employer name. Only this user's rows.
4. DELETE /api/account — apiUser(); body { confirm: "DELETE" }. Delete the users row (the database
   cascades to everything else), then delete the Clerk user with the Clerk backend client. If the
   Clerk call fails, still return success for the data deletion and log only the error code.
Put shared query helpers in src/features/profile/server.ts.

Run npm run check and scripts/check-lane.sh profile. Do not commit.
```

### A3. Screens (agent 2, same time as A2)

```text
Read AGENTS.md and the "Shared contract" in docs/RUNBOOK_PETER.md. You are in lane: profile.
Touch only src/app/(app)/onboarding/**, src/app/(app)/profile/**, src/app/(app)/settings/** and
src/features/profile/components/**. Use src/components/ui for every control. Call the API routes
described in section 4 task A2 of the runbook; assume they exist and return { ok, data | error }.

1. /onboarding — server page calls requireUser(). If user.onboardedAt is set, redirect to /home.
   A client flow with three steps and a "Step n of 3" indicator:
   Step 1 Consent and basics: two required checkboxes — "I have read the Privacy Policy" (link to
   /privacy, new tab) and "I agree that my answers and co-op reviews are stored and used, without my
   name, to produce ratings and recommendations for UC students" — then major, year, co-op track.
   Step 2 Goals: goal, goal notes, location constraint, other constraints. Saving step 2 calls
   PUT /api/profile.
   Step 3 Interests: the 30 INTEREST_ITEMS, six per page, each with LikertScale and RESPONSE_LABELS,
   a progress count, Back/Next, answers kept in component state. Submit calls POST /api/assessment,
   then goes to /home. Show ATTRIBUTION as small text under the questions.
   On load, start at step 3 if a profile row already exists, else step 1. Show field errors from the
   API next to the field. Disable the submit button while a request is in flight.
2. /profile — requireOnboardedUser(). Read-only view of basics, goals, and the six RIASEC scores as
   plain labelled numbers. A "Retake the interest questions" link.
3. /settings — requireUser(). "Download my data" (GET /api/account/export). "Delete my account":
   explains what is deleted, requires typing DELETE, calls DELETE /api/account, then sends the
   browser to /.

Run npm run check and scripts/check-lane.sh profile. Do not commit.
```

### A4. Your manual test (localhost, browser at 375px wide)

1. Fresh UC account: sign in, get sent to `/onboarding`, finish all three steps in under ten minutes.
2. In Neon (`dev-peter`): `users` has both consent timestamps and `onboarded_at`; `profiles.profile_vector` has 30 numbers; `assessments` has one row with 30 raw answers.
3. Reload mid-way through step 3 after step 2 was saved: you return to step 3, not step 1.
4. `/api/assessment` with 29 answers returns 400. `/api/profile` with `consentDataUse: false` returns 400.
5. Download my data: the JSON holds only your rows.
6. Delete my account: rows gone from all tables, and signing in again starts from an empty onboarding.
7. Read every line the agents wrote in `src/app/api/account/**`. Delete is the one place a bug destroys someone else's data.

Then: `npm run check && scripts/check-lane.sh profile`, commit, `git fetch origin && git rebase origin/main`, push, open the pull request.

## 5. Staying in sync during the build

- Check in every 45 minutes, three lines each: done, next, blocked.
- Any contract question goes to the partner the moment it comes up, not at the next check-in.
- You are the only person who pushes to `main` between the foundation and the merges. A frozen-file change request from Li (C1) interrupts your lane work; do it immediately, it is small by definition.
- Have the second model review, not co-write: when a task is done, give the diff to the agent that did not write it and ask for bugs, missing `userId` filters, and anything outside the lane.

## 6. Merge and go live (Peter)

1. Both pull requests are open and each passes C7. Read Li's diff; Li reads yours. Look hardest at ownership filters and at anything touching `users`.
2. Merge whichever is ready first. The other person rebases on `origin/main`, runs `npm run check` and re-pushes. If the lane guard passed on both, the rebase has no conflicts.
3. Merge the second. Confirm Vercel's production deployment is green.
4. Seed production employers: in a fresh shell, export the production `DATABASE_URL`, run Li's `npx tsx scripts/seed-employers.ts`, close the shell. Li never handles production credentials.
5. Production test on your phone at the production URL, both of you, with real UC emails: sign in, onboard, log one real past co-op each, check the rows in Neon's production branch, download your data. One of you then deletes the account and signs up again.
6. If production breaks after a merge: in Vercel, promote the previous deployment (instant rollback), then fix on a branch.

"Live today" is met when step 5 passes.

## 7. Gate before the first friend is invited

All of these, checked by both of you:

- [ ] Clerk **production** keys are in Vercel and a UC inbox receives the sign-in code from the production instance.
- [ ] `/privacy` says truthfully what is collected (UC email, major, year, goals, interest answers, employers, ratings, optional pay, optional free text), who can see it today (only the author and the two founders with database access), how to export and delete, and a contact email. Neither of you is a lawyer and this runbook is not legal advice; the build plan's three legal questions (FERPA, employer reviews, UC's name) are still open and worth a short consult before invitations go wide.
- [ ] The consent wording on step 1 matches what the policy says.
- [ ] Delete-my-account works on production.
- [ ] The 30 items and the credit line match the O\*NET source exactly.
- [ ] `ALLOWED_EMAIL_DOMAINS` is right, tested with one allowed and one refused address.
- [ ] Open decisions from the build plan that affect the policy are answered: which entity owns the data, and whether to talk to the co-op office before or after inviting.

## 8. Next, after today

In order: paste-your-reflection prefill for Review (brings the LLM key, the per-user cap and `usage_events`); PostHog events for onboarding and review completion; employer alias cleanup for `pending` employers; then Phase 3.
