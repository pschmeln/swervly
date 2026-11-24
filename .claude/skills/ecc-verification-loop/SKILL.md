---
name: "ecc-verification-loop"
description: "Run a six-phase check of finished code (build, types, lint, tests, secret grep, diff review) and report PASS/FAIL; use after a feature or refactor and before opening a PR."
---

# Verification Loop

Adapted from the `verification-loop` skill in ECC (github.com/affaan-m/ECC, commit 4adeee6). Copyright (c) 2026 Affaan Mustafa, MIT License.

## When to Use

- After completing a feature or significant code change
- Before creating a PR
- After refactoring
- When quality gates must pass

## In the Swervly repo

Run `scripts/preflight.sh` first: it runs `npx next typegen && npm run check` (tsc, eslint, vitest, next build) plus the repo's own safety checks. Then use the phases below to fill in anything it doesn't cover (the diff review in phase 6 especially). There is no `npm run test` script; tests run with `npx vitest run`. Never run `npm install`; ask the human. Report results in the format below.

## Phases

### 1. Build
```bash
set -o pipefail
npm run build 2>&1 | tail -20
```
If the build fails, STOP and fix before continuing.

### 2. Type Check
```bash
set -o pipefail
npx --no-install tsc --noEmit 2>&1 | sed -n '1,30p'
```
Report all type errors. Fix critical ones before continuing.

### 3. Lint
```bash
set -o pipefail
npm run lint 2>&1 | sed -n '1,30p'
```
(`sed` consumes the whole stream, so a passing linter doesn't fail on SIGPIPE under pipefail.)

### 4. Tests
```bash
set -o pipefail
npx vitest run --coverage 2>&1 | tail -50   # Swervly: no npm test script
```
Report total, passed, failed, and coverage (target 80%).

### 5. Security Scan
```bash
grep -rn "sk-" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
grep -rn "api_key" --include="*.ts" --include="*.js" . 2>/dev/null | head -10
grep -rn "console.log" --include="*.ts" --include="*.tsx" src/ 2>/dev/null | head -10
```

### 6. Diff Review
```bash
git diff --stat
git diff HEAD~1 --name-only
```
Review each changed file for unintended changes, missing error handling, and edge cases.

## Target Acceptance

When the outcome needs deployment or target-environment verification, report it separately from local checks: the environment and version, the evidence, and the next permitted check or access dependency. Passing local checks, review, merge, or release does not establish target acceptance. Do not access production or make external changes without authorization. For local-only tasks, mark target acceptance not applicable.

Example: local checks PASS; staging verification NOT PERFORMED (no access); next step: an authorized maintainer runs the staging smoke test.

## Report Format

```
VERIFICATION REPORT
==================
Build:     [PASS/FAIL]
Types:     [PASS/FAIL] (X errors)
Lint:      [PASS/FAIL] (X warnings)
Tests:     [PASS/FAIL] (X/Y passed, Z% coverage)
Security:  [PASS/FAIL] (X issues)
Diff:      [X files changed]

Overall:   [READY/NOT READY] for PR
Target:    [VERIFIED/FAILED/NOT PERFORMED/NOT APPLICABLE] (environment/version, evidence)
Next permitted step: [check or access dependency; none if complete]

Issues to Fix:
1. ...
```

## Continuous Mode

In long sessions, rerun after each finished component or major change, before moving to the next task.