#!/usr/bin/env bash
# Commit the refreshed data to the current branch and push it, surviving a race
# with another push (an owner commit, a second run). Used by the scheduled
# workflow (.github/workflows/news.yml); runs locally against a fake remote in
# scripts/commit-refresh.test.sh.
#
# Environment (all optional):
#   REFRESH_REMOTE         remote name (default origin)
#   REFRESH_BRANCH         branch to push to (default main)
#   REFRESH_PUSH_ATTEMPTS  push attempts before giving up (default 5)
#   REFRESH_RETRY_SLEEP    seconds to wait between attempts (default 3)
#   REFRESH_DATE           date in the commit message (default today, UTC)
#   GITHUB_OUTPUT          when set, `committed=true|false` and `sha=<commit>` are written to it
#
# Exit codes: 0 pushed or nothing to commit, 1 the rebase conflicted or every push was rejected.
set -euo pipefail

remote="${REFRESH_REMOTE:-origin}"
branch="${REFRESH_BRANCH:-main}"
attempts="${REFRESH_PUSH_ATTEMPTS:-5}"
pause="${REFRESH_RETRY_SLEEP:-3}"
date_iso="${REFRESH_DATE:-$(date -u +%F)}"

# What a refresh run writes and the site depends on. research/qa reports are left out on purpose: one new file per day.
paths=(data ATTRIBUTION.md research/P-live-ambtsdragers.json research/P-live-ambtsdragers.md research/merge-log.entries.jsonl)

emit() { [ -z "${GITHUB_OUTPUT:-}" ] || printf '%s\n' "$1" >> "$GITHUB_OUTPUT"; }

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"

# Stage only paths that exist or are tracked, so a missing file never aborts the run.
stage=()
for path in "${paths[@]}"; do
  if [ -e "$path" ] || git ls-files --error-unmatch -- "$path" >/dev/null 2>&1; then stage+=("$path"); fi
done
git add -A -- "${stage[@]}"
if git diff --cached --quiet; then
  echo "Nothing to commit."
  emit "committed=false"
  emit "sha=$(git rev-parse HEAD)"
  exit 0
fi
git commit -q -m "data: refresh ${date_iso} [skip ci]"

attempt=1
while true; do
  if git push -q "$remote" "HEAD:refs/heads/${branch}"; then
    echo "Pushed $(git rev-parse --short HEAD) to ${remote}/${branch} (attempt ${attempt})."
    emit "committed=true"
    emit "sha=$(git rev-parse HEAD)"
    exit 0
  fi
  if [ "$attempt" -ge "$attempts" ]; then
    echo "::error::Push to ${branch} rejected ${attempts} times; giving up." >&2
    exit 1
  fi
  echo "Push rejected (attempt ${attempt} of ${attempts}); rebasing on ${remote}/${branch}."
  # --autostash keeps unrelated working-tree changes (the qa report, pipeline caches) from blocking the rebase.
  if ! git pull -q --rebase --autostash "$remote" "$branch"; then
    git rebase --abort 2>/dev/null || true
    echo "::error::Rebase onto ${remote}/${branch} conflicted. The refresh is not published; the next run starts from the new ${branch}." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep "$pause"
done
