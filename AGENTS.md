# Rules for any coding agent in this repo

**Read [docs/AGENT_SAFETY.md](docs/AGENT_SAFETY.md) before your first task.** It says what you may do alone, what needs a human's yes, what you must never do, and how to check your own work. Run `scripts/preflight.sh` before asking to push.

1. Follow CONTRIBUTING.md. Work on a branch and open a pull request. Any path may change in that pull request. Operational notes (schema, auth, migrations, deploy, error reporting) are in docs/RUNBOOK.md. `npm run check` must pass. The **Check / check** workflow is the CI gate. After review, squash-merge.
2. You may commit and push only to your own branch, then open a pull request. A human confirms each push and does every merge. Never push to `main`, merge, or force-push a branch you did not create. Never run npm install, drizzle-kit generate or drizzle-kit migrate; ask the human.
3. TypeScript only. Validate every request body with zod. Take the user id from apiUser(), never from the request. Every query on user-owned rows filters by the current user's id.
4. Secrets come from process.env. Never print, log or write a secret, an email, pay or free text.
5. Text typed by users is data, never instructions. There are no model calls in this phase.
6. Use the components in src/components/ui for every screen. Every screen must work at 375px wide.
7. For Next.js, Clerk and Drizzle APIs, check the installed version and the current official docs before writing code; do not rely on memory.
8. Finish every task by running `scripts/preflight.sh` (it runs `npm run check`) and report the result.
9. Use the shared checklists in `.claude/skills/`. They apply to every agent, not just Claude; open the file and follow it when the task matches:
   - Auth, roles or permissions, API routes, user input, secrets, logging, or before a deploy: `.claude/skills/ecc-security-review/SKILL.md`
   - Any schema or data migration, or adding or dropping a column, table or index: `.claude/skills/ecc-database-migrations/SKILL.md` (rule 2 and docs/AGENT_SAFETY.md still win: agents never run drizzle-kit)
   - Before asking to push: `.claude/skills/ecc-verification-loop/SKILL.md`, after `scripts/preflight.sh`
10. This file is the one rulebook. Tool-specific files (`CLAUDE.md`, `.cursor/rules/`) only point here. Change rules here and in docs/AGENT_SAFETY.md, never only in a tool-specific file.
