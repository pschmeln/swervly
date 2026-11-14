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
