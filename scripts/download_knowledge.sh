#!/usr/bin/env bash
set -euo pipefail

: "${KNOWLEDGE_REPO_TOKEN:?KNOWLEDGE_REPO_TOKEN secret is required}"
repo="${KNOWLEDGE_REPO:-vmichello/namayani-haulage-knowledge}"
ref="${KNOWLEDGE_REPO_REF:-master}"
destination="${RUNNER_TEMP}/namayani-knowledge.sqlite3"

curl --fail-with-body --silent --show-error \
  --location \
  --header "Accept: application/vnd.github.raw+json" \
  --header "Authorization: Bearer ${KNOWLEDGE_REPO_TOKEN}" \
  "https://api.github.com/repos/${repo}/contents/bot-knowledge.sqlite3?ref=${ref}" \
  --output "$destination"

test -s "$destination"
printf 'KNOWLEDGE_DB=%s\n' "$destination" >> "$GITHUB_ENV"
printf 'Downloaded knowledge database from %s@%s\n' "$repo" "$ref"
