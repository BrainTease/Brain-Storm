#!/usr/bin/env bash
# Static guard for the issue #1546 quality gates. Uses only Node built-ins and
# coreutils so it can run from pre-commit/CI before dependencies are installed.

set -u

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
CONFIG="$ROOT/.commitlintrc.json"
TEMPLATE="$ROOT/.github/pull_request_template.md"
HOOK="$ROOT/.husky/commit-msg"
FAILURES=0

fail() {
  printf 'ERROR: %s\n' "$1" >&2
  FAILURES=$((FAILURES + 1))
}

pass() {
  printf 'OK: %s\n' "$1"
}

if [ ! -f "$CONFIG" ]; then
  fail "missing commitlint config: $CONFIG"
else
  if node - "$CONFIG" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`ERROR: ${file} is not valid JSON: ${err.message}`);
  process.exit(1);
}

let ok = true;
const reject = (msg) => {
  console.error(`ERROR: ${msg}`);
  ok = false;
};

if (!cfg || typeof cfg !== 'object') {
  reject('commitlint config must be a JSON object');
  process.exit(1);
}

const required = [
  'type-enum',
  'type-case',
  'type-empty',
  'subject-case',
  'subject-empty',
  'subject-full-stop',
  'scope-enum',
  'scope-case',
];
if (!cfg.rules || typeof cfg.rules !== 'object') {
  reject('commitlint config is missing the rules object');
  process.exit(1);
}
for (const name of required) {
  const rule = cfg.rules[name];
  if (!Array.isArray(rule) || rule[0] !== 2 || !['always', 'never'].includes(rule[1])) {
    reject(`rule "${name}" must be enabled at severity 2 (always/never)`);
  }
}

const scopes = cfg.rules['scope-enum'] && cfg.rules['scope-enum'][2];
if (!Array.isArray(scopes) || scopes.length === 0) {
  reject('scope-enum must contain a non-empty array');
} else {
  const seen = new Set();
  for (const scope of scopes) {
    if (typeof scope !== 'string') {
      reject('scope-enum entries must be strings');
      continue;
    }
    if (seen.has(scope)) reject(`duplicate scope in scope-enum: ${scope}`);
    seen.add(scope);
    if (scope !== '' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scope)) {
      reject(`scope-enum entry is not lowercase kebab-case: ${scope}`);
    }
  }
  const sorted = [...scopes].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a.localeCompare(b)));
  if (JSON.stringify(sorted) !== JSON.stringify(scopes)) {
    reject('scope-enum must be sorted (empty scope first, then alphabetically)');
  }
}

const extendsConfig = cfg.extends;
const inherited = Array.isArray(extendsConfig) ? extendsConfig : [extendsConfig];
if (!inherited.includes('@commitlint/config-conventional')) {
  reject('commitlint config must extend @commitlint/config-conventional');
}

if (!ok) process.exit(1);
NODE
  then
    pass "commitlint config parses and contains the required strict rules"
  else
    fail "commitlint config validation failed: $CONFIG"
  fi
fi

BEFORE=$FAILURES
if [ ! -f "$TEMPLATE" ]; then
  fail "missing PR template: $TEMPLATE"
else
  for marker in \
    'PR title follows Conventional Commits' \
    'Commitlint passes' \
    '`npm run lint` and `npm run typecheck`' \
    'Unit tests added/updated' \
    'Naming conventions followed' \
    'Import ordering followed' \
    'No new complexity violations' \
    'Coverage thresholds met' \
    'Secret scan clean'
  do
    # Marker must be an unchecked checklist item, not prose or a heading.
    if ! grep -Fq -- "- [ ] $marker" "$TEMPLATE"; then
      fail "PR template is missing checklist item: - [ ] $marker"
    fi
  done
  if [ "$FAILURES" -eq "$BEFORE" ]; then
    pass "PR template contains all required checklist markers"
  fi
fi

BEFORE=$FAILURES
if [ ! -f "$HOOK" ]; then
  fail "missing commit-msg hook: $HOOK"
else
  if ! grep -Eq 'npx[[:space:]]+--no[[:space:]]+--[[:space:]]+commitlint' "$HOOK"; then
    fail "commit-msg hook must invoke the local commitlint binary via npx --no"
  fi
  if ! grep -Fq 'commitlint --edit' "$HOOK"; then
    fail "commit-msg hook must pass --edit to commitlint"
  fi
  # Quoting prevents word splitting/globbing of the commit message path.
  if ! grep -Fq '"${1}"' "$HOOK"; then
    fail "commit-msg hook must quote the commit message path as \"\${1}\""
  fi
  if [ "$FAILURES" -eq "$BEFORE" ]; then
    pass "commit-msg hook invokes quoted, local commitlint"
  fi
fi

if [ "$FAILURES" -gt 0 ]; then
  printf 'FAILED: %d check(s) failed.\n' "$FAILURES" >&2
  exit 1
fi

printf 'All commit-lint and PR-template static checks passed.\n'
exit 0
