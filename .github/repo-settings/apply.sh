#!/usr/bin/env bash
# Applies the shared GitHub settings to a dxcufgb/FoundryVTT-… module repository.
# Idempotent: re-run it to fix drift or to set up a new module repository.
#
#   .github/repo-settings/apply.sh <owner/repo> [--description "…"] [--topic dnd5e]…
#
# What it sets:
#   - squash merge only (title = commit or PR title, body = commit messages), auto-merge on,
#     head branches deleted after merge, issues/projects/wiki on, discussions off
#   - topics foundryvtt, foundry-vtt, foundry-vtt-module (+ any --topic)
#   - the "accessibility" label
#   - secret scanning + push protection, Dependabot alerts + security updates,
#     private vulnerability reporting, CodeQL default setup
#   - the "Protect main" ruleset from ruleset-protect-main.json next to this script
#     (PR with 1 approval, "Check module" must pass, squash only, no force push or deletion,
#     admins may bypass through a pull request)
# Rulesets, secret scanning, vulnerability reporting and CodeQL need a public repository
# on the free plan; for a private repository those steps are reported and skipped.
#
# Needs the GitHub CLI (https://cli.github.com) logged in as the repository owner.
set -uo pipefail

FULL="${1:?usage: apply.sh <owner/repo> [--description text] [--topic name]...}"; shift
DESCRIPTION=""
TOPICS=(foundryvtt foundry-vtt foundry-vtt-module)
while [[ $# -gt 0 ]]; do
  case "$1" in
    --description) DESCRIPTION="$2"; shift 2 ;;
    --topic) TOPICS+=("$2"); shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
failures=0
step() { printf '  %-44s' "$1"; }
ok() { echo "ok"; }
bad() { echo "FAILED ${1:-}"; failures=$((failures + 1)); }
skip() { echo "skipped (${1})"; }
run() { local out; out="$("$@" 2>&1 >/dev/null)" && ok || bad "$(echo "$out" | tail -1)"; }

echo "$FULL"
VISIBILITY="$(gh api "repos/$FULL" --jq .visibility)" || { echo "  cannot read the repository" >&2; exit 1; }

step "merge settings"
run gh api -X PATCH "repos/$FULL" \
  -F allow_squash_merge=true -F allow_merge_commit=false -F allow_rebase_merge=false \
  -f squash_merge_commit_title=COMMIT_OR_PR_TITLE -f squash_merge_commit_message=COMMIT_MESSAGES \
  -F delete_branch_on_merge=true -F allow_auto_merge=true -F allow_update_branch=false \
  -F has_issues=true -F has_projects=true -F has_wiki=true -F has_discussions=false

if [[ -n "$DESCRIPTION" ]]; then
  step "description"
  run gh api -X PATCH "repos/$FULL" -f description="$DESCRIPTION"
fi

step "topics"
topics_json="$(printf '%s\n' "${TOPICS[@]}" | jq -R . | jq -sc '{names: (unique)}')"
run gh api -X PUT "repos/$FULL/topics" --input - <<<"$topics_json"

step "label 'accessibility'"
if gh api "repos/$FULL/labels/accessibility" >/dev/null 2>&1; then ok; else
  run gh api -X POST "repos/$FULL/labels" -f name=accessibility -f color=0e8a16 -f description="Usability for players with disabilities"
fi

step "Dependabot alerts"
run gh api -X PUT "repos/$FULL/vulnerability-alerts"
step "Dependabot security updates"
run gh api -X PUT "repos/$FULL/automated-security-fixes"

if [[ "$VISIBILITY" == "public" ]]; then
  step "secret scanning + push protection"
  run gh api -X PATCH "repos/$FULL" --input - <<<'{"security_and_analysis":{"secret_scanning":{"status":"enabled"},"secret_scanning_push_protection":{"status":"enabled"}}}'
  step "private vulnerability reporting"
  run gh api -X PUT "repos/$FULL/private-vulnerability-reporting"
  step "CodeQL default setup"
  run gh api -X PATCH "repos/$FULL/code-scanning/default-setup" -f state=configured -f query_suite=default
  step "ruleset 'Protect main'"
  EXISTING_IDS="$(gh api "repos/$FULL/rulesets" --jq '.[] | select(.name | ascii_downcase | startswith("protect")) | .id' 2>/dev/null)"
  FIRST="$(head -n1 <<<"$EXISTING_IDS")"
  if [[ -n "$FIRST" ]]; then
    run gh api -X PUT "repos/$FULL/rulesets/$FIRST" --input "$DIR/ruleset-protect-main.json"
  else
    run gh api -X POST "repos/$FULL/rulesets" --input "$DIR/ruleset-protect-main.json"
  fi
else
  for s in "secret scanning + push protection" "private vulnerability reporting" "CodeQL default setup" "ruleset 'Protect main'"; do
    step "$s"; skip "private repository"
  done
fi

[[ $failures -eq 0 ]] && echo "  done" || echo "  $failures step(s) failed"
exit $((failures > 0))
