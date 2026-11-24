#!/usr/bin/env bash
# Check for duplicate exported function/const names across tracked .ts/.tsx files
# under apps/ and packages/. Dependency-free (git + grep + awk only).
#
# Usage:
#   scripts/check-duplicate-utils.sh            # fail on duplicates not in the allowlist
#   scripts/check-duplicate-utils.sh --update   # regenerate the allowlist from the current tree
#
# The allowlist format is one entry per line: <name><TAB><comma-separated sorted file paths>.
# Lines starting with '#' are comments. An entry only matches the exact set of files, so a
# duplicate introduced in a new file is still reported.

set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "${ROOT}" ]; then
  echo "check-duplicate-utils: run this script inside a git worktree" >&2
  exit 2
fi
cd "${ROOT}" || exit 2

ALLOWLIST="${DUPLICATE_UTILS_ALLOWLIST:-scripts/duplicate-utils-allowlist.txt}"
if [ ! -f "${ALLOWLIST}" ]; then
  echo "check-duplicate-utils: missing allowlist ${ALLOWLIST}" >&2
  exit 2
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

# 1. Extract exported names from tracked files. Framework route components
#    (export default), stories, tests and mocks are intentionally out of scope.
git grep -n -E '^[[:space:]]*export[[:space:]]+(async[[:space:]]+)?(function|const|let|var)[[:space:]]+[A-Za-z_$][A-Za-z0-9_$]*' -- apps packages > "${TMP_DIR}/raw" 2>/dev/null || true

awk -F: '
  $1 ~ /\.(ts|tsx)$/ &&
  $1 !~ /(\/__tests__\/|\/__mocks__\/|\/e2e\/|\/fixtures\/|\/node_modules\/|\/dist\/|\/build\/|\/\.next\/|\.test\.|\.spec\.|\.stories\.|\.d\.ts$)/ {
    line = $0
    sub(/^[^:]*:[0-9]+:/, "", line)
    if (match(line, /export[[:space:]]+(async[[:space:]]+)?(function|const|let|var)[[:space:]]+[A-Za-z_$][A-Za-z0-9_$]*/)) {
      name = substr(line, RSTART, RLENGTH)
      sub(/^export[[:space:]]+/, "", name)
      sub(/^(async[[:space:]]+)?(function|const|let|var)[[:space:]]+/, "", name)
      print name "\t" $1
    }
  }
' "${TMP_DIR}/raw" | sort -u > "${TMP_DIR}/name-files"

# 2. Group names defined in more than one distinct file.
awk -F'\t' '
  { files[$1] = files[$1] (files[$1] == "" ? "" : ",") $2; count[$1]++ }
  END { for (name in count) if (count[name] > 1) print name "\t" files[name] }
' "${TMP_DIR}/name-files" | sort > "${TMP_DIR}/findings"

FINDING_COUNT="$(wc -l < "${TMP_DIR}/findings" | tr -d ' ')"

if [ "${1:-}" = "--update" ]; then
  {
    echo "# Duplicate exported utility names — allowlist for scripts/check-duplicate-utils.sh"
    echo "# Format: <name><TAB><comma-separated sorted file paths>. Regenerate with --update."
    cat "${TMP_DIR}/findings"
  } > "${ALLOWLIST}"
  echo "Updated ${ALLOWLIST} with ${FINDING_COUNT} allowlisted duplicate name(s)."
  exit 0
fi

# 3. Compare against the allowlist; only exact name + file-set matches are accepted.
awk -F'\t' '
  NR == FNR { if ($1 !~ /^#/ && NF >= 2) allow[$1] = $2; next }
  { if (($1 in allow) && allow[$1] == $2) allowed++; else print }
  END { printf "%d\n", allowed > "/dev/stderr" }
' "${ALLOWLIST}" "${TMP_DIR}/findings" 2> "${TMP_DIR}/allowed-count" > "${TMP_DIR}/new"
ALLOWED_COUNT="$(tr -d ' ' < "${TMP_DIR}/allowed-count")"
NEW_COUNT="$(wc -l < "${TMP_DIR}/new" | tr -d ' ')"

echo "Duplicate exported names across files: ${FINDING_COUNT}"
echo "Allowlisted (justified exceptions): ${ALLOWED_COUNT}"
echo "New (unapproved) duplicates: ${NEW_COUNT}"

if [ "${NEW_COUNT}" -gt 0 ]; then
  echo "ERROR: new duplicate exported names detected:" >&2
  awk -F'\t' '
    { printf "  %s\n", $1; n = split($2, paths, ","); for (i = 1; i <= n; i++) printf "    - %s\n", paths[i] }
  ' "${TMP_DIR}/new" >&2
  echo "Consolidate these into @brain-storm/utils, or add a justified entry to ${ALLOWLIST}." >&2
  exit 1
fi

echo "OK: no new duplicate exported utility names."
exit 0
