#!/usr/bin/env bash
set -euo pipefail

# Automated helper: commit local changes, pull remote, resolve conflicts (favoring ours), push
# Location: scripts/continuous_commit_and_resolve.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not a git repository: $REPO_ROOT"
  exit 1
fi

# Target branch for automated commits
TARGET_BRANCH="automated/continuous-commits"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD || true)
if [ -z "$CURRENT_BRANCH" ] || [ "$CURRENT_BRANCH" = "HEAD" ]; then
  git checkout -b "$TARGET_BRANCH"
  CURRENT_BRANCH="$TARGET_BRANCH"
fi

if [ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]; then
  if git show-ref --verify --quiet "refs/heads/$TARGET_BRANCH"; then
    git checkout "$TARGET_BRANCH"
  else
    git checkout -b "$TARGET_BRANCH"
  fi
fi

# Commit any local changes
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "chore: automated continuous commit $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
fi

# Skip remote operations when SKIP_PUSH=1
if [ "${SKIP_PUSH:-0}" = "1" ]; then
  echo "SKIP_PUSH=1; skipping remote pull/push and related checks."
else
  # If a remote exists, try to pull and merge, resolving conflicts by keeping 'ours'
  if git remote | grep -q .; then
    if git ls-remote --exit-code --heads origin "$TARGET_BRANCH" >/dev/null 2>&1; then
      set +e
      git pull --no-edit origin "$TARGET_BRANCH"
      PULL_EXIT=$?
      set -e

      # Check for unmerged/conflicted files
      CONFLICTS=$(git diff --name-only --diff-filter=U || true)
      if [ -n "$CONFLICTS" ]; then
        echo "Conflicts detected; resolving by keeping 'ours' for each file."
        for f in $CONFLICTS; do
          git checkout --ours -- "$f" || true
          git add "$f"
        done
        git commit -m "chore: resolve merge conflicts (ours) - automated" || true
      fi
    else
      # remote branch doesn't exist yet; push will create it
      :
    fi
  fi

  # Final push attempt (safe; ignore failures)
  git push -u origin "$TARGET_BRANCH" || true
fi

echo "Automation script finished. Current branch: $(git rev-parse --abbrev-ref HEAD)"
