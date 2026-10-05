#!/usr/bin/env bash
# Dry run of scripts/commit-refresh.sh against a throwaway bare repository over
# file://. Covers: nothing to commit, a clean push, a lost race that needs a
# rebase (full and shallow clone), and a rebase conflict. No network, no GitHub.
#   bash scripts/commit-refresh.test.sh
set -euo pipefail

script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/commit-refresh.sh"
work="$(mktemp -d "${TMPDIR:-/tmp}/commit-refresh-test.XXXXXX")"
trap 'rm -rf "$work"' EXIT
export GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_SYSTEM=/dev/null
export REFRESH_RETRY_SLEEP=0 REFRESH_DATE=2026-10-05
fail=0
check() { if eval "$2"; then echo "ok   $1"; else echo "FAIL $1"; fail=1; for f in "$work"/log*; do echo "--- $f"; cat "$f"; done; fi; }
owner() { git -c user.name=Owner -c user.email=owner@example.invalid "$@"; }
# Run the script in a clone; never abort the test on its exit code, and show its log on failure.
run_in() { # run_in <dir> <log> <output-file> [ENV=value...]
  local dir="$1" log="$2" out="$3"; shift 3
  set +e
  ( cd "$dir" && env GITHUB_OUTPUT="$out" "$@" bash "$script" ) > "$log" 2>&1
  code=$?
  set -e
}

bare="$work/remote.git"
git init -q --bare -b main "$bare"
seed="$work/seed"
git init -q -b main "$seed"
mkdir -p "$seed/data" "$seed/research"
printf '{\n  "a": 1,\n  "b": 2\n}\n' > "$seed/data/people.json"
printf '{\n  "x": 1\n}\n' > "$seed/data/news.json"
printf 'notes\n' > "$seed/README.md"
owner -C "$seed" add -A && owner -C "$seed" commit -q -m seed
git -C "$seed" push -q "file://$bare" main

clone() { local dir="$1"; shift; git clone -q "$@" "file://$bare" "$dir"; }

# 1. Nothing changed: no commit, exit 0.
clone "$work/c1"
run_in "$work/c1" "$work/log1" "$work/out1"
check "nothing to commit exits 0" "grep -q 'Nothing to commit' $work/log1"
check "nothing to commit writes committed=false" "grep -q 'committed=false' $work/out1"
check "nothing to commit leaves the remote alone" "[ \"\$(git -C $bare rev-list --count main)\" = 1 ]"

# 2. Clean push, as the bot.
clone "$work/c2"
printf '{\n  "a": 2,\n  "b": 2\n}\n' > "$work/c2/data/people.json"
printf 'qa\n' > "$work/c2/untracked-qa.md"   # outside the path list: must stay out of the commit
run_in "$work/c2" "$work/log2" "$work/out2"
check "clean push lands on the remote" "[ \"\$(git -C $bare rev-list --count main)\" = 2 ]"
check "commit message has the date and [skip ci]" "[ \"\$(git -C $bare log -1 --format=%s main)\" = 'data: refresh 2026-10-05 [skip ci]' ]"
check "commit author is github-actions[bot]" "[ \"\$(git -C $bare log -1 --format=%an main)\" = 'github-actions[bot]' ]"
check "files outside the path list are not committed" "! git -C $bare ls-tree -r --name-only main | grep -q untracked-qa"
check "committed=true and the sha are written" "grep -q 'committed=true' $work/out2 && grep -q \"sha=\$(git -C $bare rev-parse main)\" $work/out2"

# 3. Lost race, no conflict: the owner pushes a different file after the bot cloned.
for mode in full shallow; do
  if [ "$mode" = shallow ]; then clone "$work/c3$mode" --depth=1; else clone "$work/c3$mode"; fi
  printf '{\n  "x": %s\n}\n' "$([ "$mode" = full ] && echo 5 || echo 6)" > "$work/c3$mode/data/news.json"
  clone "$work/o3$mode"
  printf 'owner edit %s\n' "$mode" > "$work/o3$mode/README.md"
  owner -C "$work/o3$mode" commit -q -am "docs: owner edit $mode"
  git -C "$work/o3$mode" push -q origin main
  before="$(git -C "$bare" rev-list --count main)"
  run_in "$work/c3$mode" "$work/log3$mode" "$work/out3$mode"
  check "[$mode] race: push retried after a rebase" "grep -q 'rebasing' $work/log3$mode"
  check "[$mode] race: owner commit and bot commit both on the remote" "[ \"\$(git -C $bare rev-list --count main)\" = $((before + 1)) ] && git -C $bare log --format=%s main | grep -q 'owner edit $mode'"
  check "[$mode] race: history stays linear" "[ -z \"\$(git -C $bare rev-list --merges main)\" ]"
  check "[$mode] race: reported sha is the remote head" "grep -q \"sha=\$(git -C $bare rev-parse main)\" $work/out3$mode"
done

# 4. Conflict: the owner edits the same line the bot changed.
clone "$work/c4"
printf '{\n  "a": 99,\n  "b": 2\n}\n' > "$work/c4/data/people.json"
clone "$work/o4"
printf '{\n  "a": 7,\n  "b": 2\n}\n' > "$work/o4/data/people.json"
owner -C "$work/o4" commit -q -am "data: owner fix"
git -C "$work/o4" push -q origin main
head_before="$(git -C "$bare" rev-parse main)"
run_in "$work/c4" "$work/log4" "$work/out4"
check "conflict exits 1" "[ $code = 1 ]"
check "conflict leaves the remote untouched" "[ \"\$(git -C $bare rev-parse main)\" = $head_before ]"
check "conflict leaves no rebase in progress" "[ ! -d $work/c4/.git/rebase-merge ] && [ ! -d $work/c4/.git/rebase-apply ]"
check "conflict names the problem" "grep -q 'conflicted' $work/log4"

# 5. Every push rejected (a remote hook refuses): gives up after the attempts, exit 1.
printf '#!/bin/sh\nexit 1\n' > "$bare/hooks/pre-receive" && chmod +x "$bare/hooks/pre-receive"
clone "$work/c5"
printf '{\n  "x": 42\n}\n' > "$work/c5/data/news.json"
run_in "$work/c5" "$work/log5" "$work/out5" REFRESH_PUSH_ATTEMPTS=3
check "rejected pushes give up with exit 1" "[ $code = 1 ] && grep -q 'rejected 3 times' $work/log5"

[ "$fail" = 0 ] && echo "all checks passed" || { echo "some checks failed"; exit 1; }
