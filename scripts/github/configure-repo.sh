#!/usr/bin/env bash
# Applies the security-first GitHub repository configuration (idempotent).
# Documented in docs/security.md §4. Requires the GitHub CLI with admin rights on the repo.
#
#   scripts/github/configure-repo.sh [--without-rulesets | --rulesets-only] [owner/repo]
#
# Note: the branch ruleset blocks direct pushes to main. Push the initial history first,
# then apply the rulesets.
set -euo pipefail

MODE=all
case "${1:-}" in
  --without-rulesets) MODE=settings; shift ;;
  --rulesets-only) MODE=rulesets; shift ;;
esac
REPO="${1:-stefanniedermaier/riddles}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

api() { gh api -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' "$@"; }
step() { printf '\n▶ %s\n' "$*"; }
optional() { local label="$1"; shift; "$@" >/dev/null 2>&1 && echo "  ✔ $label" || echo "  ⚠ $label: not available for this repository/plan"; }

apply_settings() {
  step "Repository options (squash only, delete merged branches, no wiki/projects)"
  api -X PATCH "repos/$REPO" --input - >/dev/null <<'JSON'
{
  "has_wiki": false,
  "has_projects": false,
  "has_issues": true,
  "allow_merge_commit": false,
  "allow_rebase_merge": false,
  "allow_squash_merge": true,
  "squash_merge_commit_title": "PR_TITLE",
  "squash_merge_commit_message": "PR_BODY",
  "delete_branch_on_merge": true,
  "allow_update_branch": true,
  "allow_auto_merge": false
}
JSON

  step "Security features"
  api -X PATCH "repos/$REPO" --input - >/dev/null <<'JSON'
{
  "security_and_analysis": {
    "secret_scanning": { "status": "enabled" },
    "secret_scanning_push_protection": { "status": "enabled" }
  }
}
JSON
  echo "  ✔ secret scanning + push protection"
  api -X PUT "repos/$REPO/vulnerability-alerts" >/dev/null && echo "  ✔ Dependabot alerts"
  api -X PUT "repos/$REPO/automated-security-fixes" >/dev/null && echo "  ✔ Dependabot security updates"
  api -X PUT "repos/$REPO/private-vulnerability-reporting" >/dev/null && echo "  ✔ private vulnerability reporting"
  # Only available with GitHub Advanced Security – the API accepts the request either way,
  # so read the effective status back.
  for feature in secret_scanning_non_provider_patterns secret_scanning_validity_checks; do
    api -X PATCH "repos/$REPO" -f "security_and_analysis[$feature][status]=enabled" >/dev/null 2>&1 || true
    if [[ "$(api "repos/$REPO" --jq ".security_and_analysis.$feature.status")" == enabled ]]; then
      echo "  ✔ $feature"
    else
      echo "  ⚠ $feature: requires GitHub Advanced Security"
    fi
  done

  # The CI workflow runs CodeQL with the stricter security-extended suite ("advanced setup");
  # GitHub's default setup must be off, otherwise its SARIF uploads are rejected.
  api -X PATCH "repos/$REPO/code-scanning/default-setup" -f state=not-configured >/dev/null \
    && echo "  ✔ CodeQL default setup disabled (advanced setup in deploy.yml)"

  step "GitHub Actions (GitHub-owned actions only, SHA pinning, read-only token)"
  api -X PUT "repos/$REPO/actions/permissions" -F enabled=true -f allowed_actions=selected >/dev/null
  api -X PUT "repos/$REPO/actions/permissions/selected-actions" \
    -F github_owned_allowed=true -F verified_allowed=false >/dev/null
  optional sha_pinning_required api -X PUT "repos/$REPO/actions/permissions" -F enabled=true -f allowed_actions=selected -F sha_pinning_required=true
  api -X PUT "repos/$REPO/actions/permissions/workflow" \
    -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false >/dev/null
  optional fork-pr-contributor-approval api -X PUT "repos/$REPO/actions/permissions/fork-pr-contributor-approval" -f approval_policy=all_external_contributors
  echo "  ✔ allowed actions, default token read-only, Actions cannot approve PRs"

  step "GitHub Pages (Actions build, HTTPS enforced)"
  api -X PUT "repos/$REPO/pages" -f build_type=workflow >/dev/null && echo "  ✔ pages built by GitHub Actions"
  # The TLS certificate only exists after the first deployment.
  optional "https_enforced (rerun after the first deployment if this fails)" api -X PUT "repos/$REPO/pages" -F https_enforced=true

  step "Environment github-pages (deploy from release tags v* only)"
  api -X PUT "repos/$REPO/environments/github-pages" --input - >/dev/null <<'JSON'
{ "deployment_branch_policy": { "protected_branches": false, "custom_branch_policies": true } }
JSON
  local policies="repos/$REPO/environments/github-pages/deployment-branch-policies"
  # Remove every policy except the release-tag pattern …
  api "$policies" --jq '.branch_policies[] | select(.type != "tag" or .name != "v*") | .id' |
    while read -r id; do api -X DELETE "$policies/$id" >/dev/null; done
  # … and make sure the release-tag pattern exists.
  if ! api "$policies" --jq '.branch_policies[] | select(.type == "tag") | .name' | grep -qx 'v\*'; then
    api -X POST "$policies" -f 'name=v*' -f type=tag >/dev/null
  fi
  echo "  ✔ environment deployment policy: tags v*"
}

upsert_ruleset() {
  local name="$1" file="$2" id
  id="$(api "repos/$REPO/rulesets" --jq ".[] | select(.name == \"$name\") | .id")"
  if [[ -n "$id" ]]; then
    api -X PUT "repos/$REPO/rulesets/$id" --input "$file" >/dev/null && echo "  ✔ updated ruleset $name"
  else
    api -X POST "repos/$REPO/rulesets" --input "$file" >/dev/null && echo "  ✔ created ruleset $name"
  fi
}

apply_rulesets() {
  step "Rulesets"
  upsert_ruleset main "$ROOT/.github/rulesets/main.json"
  upsert_ruleset release-tags "$ROOT/.github/rulesets/release-tags.json"
}

[[ "$MODE" != rulesets ]] && apply_settings
[[ "$MODE" != settings ]] && apply_rulesets
printf '\nDone: %s\n' "$REPO"
