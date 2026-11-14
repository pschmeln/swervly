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
