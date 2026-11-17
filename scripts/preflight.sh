#!/usr/bin/env bash
# Preflight: an agent's self-check before asking to push. See docs/AGENT_SAFETY.md.
#
# Usage:
#   scripts/preflight.sh            all checks, including the full `npm run check`
#   scripts/preflight.sh --no-build all checks except `npm run check` (for a quick look mid-task)
#
# Exit codes:
#   0  passed, and nothing needs permission
#   1  FAILED: fix before asking to push
#   3  passed, but the change NEEDS PERMISSION (large or sensitive): ask the human first
#
# It compares the working tree (committed + uncommitted + new files) against the
# point where this branch left origin/main.

set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

run_check=1
[ "${1:-}" = "--no-build" ] && run_check=0

LARGE_FILES=15
LARGE_LINES=400

fail=0
needs=0
red()    { printf '\033[31m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
FAIL() { red "FAIL  $*"; fail=1; }
ASK()  { yellow "ASK   $*"; needs=1; }
WARN() { yellow "WARN  $*"; }
OK()   { green "ok    $*"; }

echo "== Preflight =="

# 1. Branch
branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$branch" = "main" ] || [ "$branch" = "HEAD" ]; then
  FAIL "You are on '$branch'. Work on your own branch: git checkout -b <agent>/<topic>"
else
  OK "branch $branch"
fi

# 2. Up to date with main
if ! git fetch -q origin main 2>/dev/null; then
  WARN "could not fetch origin/main; comparing against the last fetched copy"
fi
if ! base="$(git merge-base HEAD origin/main 2>/dev/null)"; then
  red "FAIL  cannot find where this branch left origin/main (shallow clone?). Run: git fetch --depth=50 origin main"
  exit 1
fi
behind="$(git rev-list --count HEAD..origin/main)"
if [ "$behind" -gt 0 ]; then
  WARN "main has $behind new commit(s). Rebase before pushing: git fetch origin && git rebase origin/main"
else
  OK "up to date with origin/main"
fi

# 3. What changed (committed, uncommitted and untracked)
changed="$( { git diff --name-only "$base"; git ls-files --others --exclude-standard; } | sort -u)"
if [ -z "$changed" ]; then
  WARN "no changes against main"
fi
nfiles="$(printf '%s\n' "$changed" | grep -c . || true)"
nlines="$(git diff --numstat "$base" | awk '{ if ($1 != "-") s += $1 + $2 } END { print s + 0 }')"
while IFS= read -r f; do
  [ -f "$f" ] && nlines=$((nlines + $(wc -l < "$f")))
done < <(git ls-files --others --exclude-standard)
echo "      $nfiles file(s), about $nlines line(s) changed"
if [ "$nfiles" -gt "$LARGE_FILES" ] || [ "$nlines" -gt "$LARGE_LINES" ]; then
  ASK "large change (over $LARGE_FILES files or $LARGE_LINES lines). Ask before pushing, or split it."
fi

# 4. Sensitive paths: changes here always need permission
sensitive='^(src/lib/auth\.ts|src/proxy\.ts|src/db/|drizzle/|src/app/api/account/|src/features/privacy/|src/app/privacy/|src/app/api/founders/|src/features/moderation/|src/lib/founders\.ts|src/lib/invites\.ts|src/lib/sentry|src/sentry\.|src/instrumentation|src/lib/analytics\.ts|src/content/|package\.json|package-lock\.json|next\.config\.|drizzle\.config\.|tsconfig\.json|eslint\.config\.|vitest\.config\.|\.github/|\.env\.example|\.gitignore|AGENTS\.md|CONTRIBUTING\.md|docs/AGENT_SAFETY\.md|scripts/)'
hits="$(printf '%s\n' "$changed" | grep -E "$sensitive" || true)"
if [ -n "$hits" ]; then
  ASK "sensitive files changed (see docs/AGENT_SAFETY.md, 'Sensitive files'):"
  printf '%s\n' "$hits" | sed 's/^/        /'
fi

# 5. Applied migrations must never be edited or deleted
edited_migrations="$(git diff --name-status "$base" -- drizzle/ | awk '$1 != "A" && $2 ~ /\.sql$/ { print $2 }')"
if [ -n "$edited_migrations" ]; then
  FAIL "existing migration changed or deleted. Add a new migration instead:"
  printf '%s\n' "$edited_migrations" | sed 's/^/        /'
fi

# 6. Secrets in added lines (values are never printed)
added="$( { git diff -U0 "$base" | grep -E '^\+[^+]' ; while IFS= read -r f; do [ -f "$f" ] && sed 's/^/+/' "$f"; done < <(git ls-files --others --exclude-standard); } || true)"
secret_patterns='postgres(ql)?://[^:/@[:space:]]+:[^@[:space:]]+@|npg_[A-Za-z0-9]{8,}|sk_(live|test)_[A-Za-z0-9]{10,}|sntry[su]_[A-Za-z0-9]{10,}|phx_[A-Za-z0-9]{10,}|gh[pousr]_[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|whsec_[A-Za-z0-9]{10,}'
secret_count="$(printf '%s\n' "$added" | grep -cE "$secret_patterns" || true)"
if [ "$secret_count" -gt 0 ]; then
  FAIL "$secret_count added line(s) look like a secret (connection string, API key or token). Remove them and tell the human."
else
  OK "no secrets in added lines"
fi
envfiles="$(printf '%s\n' "$changed" | grep -E '(^|/)\.env' | grep -v '\.env\.example$' || true)"
[ -n "$envfiles" ] && FAIL "an .env file is part of the change: $envfiles"

# 7. Logging of personal data
logs="$(printf '%s\n' "$added" | grep -cE 'console\.(log|info|debug|warn|error)\(' || true)"
if [ "$logs" -gt 0 ]; then
  WARN "$logs added console.* call(s). Remove debug logging. Never log emails, pay, free text or request bodies."
fi

# 8. Tests: a code change with no test change is suspicious
code_changed="$(printf '%s\n' "$changed" | grep -E '^src/.*\.(ts|tsx)$' || true)"
tests_changed="$(printf '%s\n' "$changed" | grep -E '^tests/' || true)"
if [ -n "$code_changed" ] && [ -z "$tests_changed" ]; then
  WARN "src/ changed but tests/ did not. Add or update a test, or say in the PR why none is needed."
fi

# 9. Lockfile without package.json (or the reverse)
if printf '%s\n' "$changed" | grep -qx 'package-lock.json' && ! printf '%s\n' "$changed" | grep -qx 'package.json'; then
  FAIL "package-lock.json changed without package.json. Restore it: git checkout origin/main -- package-lock.json"
fi

# 10. The real gate: same steps as CI
if [ "$run_check" -eq 1 ]; then
  echo "== npx next typegen && npm run check (same as CI) =="
  if npx next typegen >/tmp/preflight-typegen.log 2>&1 && npm run check >/tmp/preflight-check.log 2>&1; then
    OK "npm run check passed"
  else
    if grep -q "next/font" /tmp/preflight-check.log && ! grep -qE "error TS|✖|FAIL " /tmp/preflight-check.log; then
      WARN "type-check, lint and tests passed; next build failed only on next/font (no network for Google Fonts here). CI must confirm the build."
    else
      FAIL "npm run check failed. Last lines:"
      tail -25 /tmp/preflight-check.log /tmp/preflight-typegen.log 2>/dev/null | sed 's/^/        /'
    fi
  fi
else
  WARN "skipped npm run check (--no-build). Run the full preflight before asking to push."
fi

echo "== Result =="
if [ "$fail" -ne 0 ]; then
  red "FAILED. Fix the FAIL lines above, then run preflight again."
  exit 1
elif [ "$needs" -ne 0 ]; then
  yellow "PASSED, but this change NEEDS PERMISSION. Ask the human using the template in docs/AGENT_SAFETY.md."
  exit 3
else
  green "PASSED. Ask the human to confirm the push."
  exit 0
fi
