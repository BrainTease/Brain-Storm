#!/usr/bin/env bash
# Dependency-free static check for import ordering and duplicate imports.
#
# Mirrors the ordering rules declared in the ESLint configs:
#   - apps/frontend/.eslintrc.js and apps/backend/.eslintrc.js use
#     import/order with alphabetize asc (case-insensitive) and pathGroups
#     that place "@/**" in the internal group for the frontend.
#   - the root .eslintrc.js (used by packages/*) uses simple-import-sort
#     with groups: external, @brain-storm/, parent, sibling, other.
#
# Usage:
#   ./scripts/check-import-order.sh            # check all tracked sources
#   git diff --cached --name-only --diff-filter=ACMR \
#     | ./scripts/check-import-order.sh --stdin  # check staged sources only
#
# Exit code: 0 when clean, 1 when violations are found.
set -uo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "check-import-order.sh: node is required" >&2
  exit 2
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
export IMPORT_CHECK_ROOT="$ROOT"
export IMPORT_CHECK_STDIN="${1:-}"
if [ "${1:-}" = "--stdin" ]; then
  IMPORT_CHECK_LIST="$(mktemp)"
  export IMPORT_CHECK_LIST
  trap 'rm -f "$IMPORT_CHECK_LIST"' EXIT
  cat > "$IMPORT_CHECK_LIST"
fi

node <<'NODE'
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.env.IMPORT_CHECK_ROOT || process.cwd();
const stdinMode = process.env.IMPORT_CHECK_STDIN === '--stdin';

const IGNORED = new Set(['node_modules','dist','build','coverage','lib','out','.next','.nuxt','generated','__generated__']);
const BUILTIN = new Set(('assert async_hooks buffer child_process cluster console constants crypto dgram dns domain events fs http http2 https module net os path perf_hooks process punycode querystring readline repl stream string_decoder timers tls trace_events tty url util v8 vm worker_threads zlib').split(' '));
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });
const cmp = (a, b) => collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);

let files;
if (stdinMode) {
  files = fs.readFileSync(process.env.IMPORT_CHECK_LIST, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)
    .filter(f => /\.(ts|tsx)$/.test(f) && !f.endsWith('.d.ts'));
} else {
  files = execFileSync('git', ['ls-files', '-z', '--', '*.ts', '*.tsx'], { cwd: root, maxBuffer: 64 * 1024 * 1024 })
    .toString().split('\0').filter(Boolean)
    .filter(f => !f.endsWith('.d.ts'));
}
files = files.filter(f => !f.split('/').some(s => IGNORED.has(s)));

function modeFor(f) {
  if (f.startsWith('apps/frontend/')) return 'frontend';
  if (f.startsWith('apps/backend/')) return 'backend';
  return 'root';
}
function groupOf(src, mode) {
  if (mode === 'root') {
    if (/^@brain-storm\//.test(src)) return 1;
    if (/^\.\.(?!\/?$)/.test(src) || /^\.\.\/?$/.test(src)) return 2;
    if (/^\./.test(src)) return 3;
    if (/^@?\w/.test(src)) return 0;
    return 4;
  }
  if (src.startsWith('node:')) return 0;
  if (mode === 'backend' && BUILTIN.has(src)) return 0;
  if (mode === 'frontend' && src.startsWith('@/')) return 2;
  if (src.startsWith('../')) return 3;
  if (src.startsWith('./') || src === '.' || src === '..') return 4;
  return 1;
}
function label(g, mode) {
  if (mode === 'root') return ['external', '@brain-storm/', 'parent (../)', 'sibling (./)', 'other'][g];
  return ['builtin', 'external', 'internal', 'parent (../)', 'sibling (./)', 'index'][g];
}
function parseImports(text) {
  const lines = text.split('\n');
  const imports = [];
  let i = 0;
  const starts = l => /^\s*import\b/.test(l) && !/^\s*import\s*\(/.test(l);
  while (i < lines.length) {
    if (!starts(lines[i])) { i++; continue; }
    const block = [lines[i]];
    while (i < lines.length - 1 && !/from\s*['"]|^\s*import\s*['"]/.test(block[block.length - 1])) {
      i++; block.push(lines[i]);
    }
    const joined = block.join('\n');
    const m = /from\s*['"]([^'"]+)['"]/.exec(joined) || /^\s*import\s*['"]([^'"]+)['"]/.exec(joined);
    if (m) imports.push({ line: i - block.length + 2, src: m[1], sideEffect: !/from\s*['"]/.test(joined) });
    i++;
  }
  return imports;
}

let order = 0, duplicates = 0, affected = 0;
for (const f of files) {
  const abs = path.join(root, f);
  if (!fs.existsSync(abs)) continue;
  const text = fs.readFileSync(abs, 'utf8');
  const imports = parseImports(text);
  if (!imports.length) continue;
  const mode = modeFor(f);
  const problems = [];

  let maxGroup = -1, maxSource = null;
  for (const imp of imports) {
    if (imp.sideEffect) { maxGroup = -1; maxSource = null; continue; }
    const g = groupOf(imp.src, mode);
    if (g < maxGroup || (g === maxGroup && maxSource !== null && cmp(maxSource, imp.src) > 0)) {
      problems.push(`${f}:${imp.line}: import order: '${imp.src}' appears after '${maxSource}' (${label(g, mode)} group)`);
    }
    if (g >= maxGroup) { maxGroup = g; maxSource = imp.src; }
  }

  const seen = new Set();
  for (const imp of imports) {
    if (seen.has(imp.src)) problems.push(`${f}:${imp.line}: duplicate import from '${imp.src}'`);
    seen.add(imp.src);
  }
  if (!problems.length) continue;
  affected++;
  problems.forEach(p => console.log(p));
  order += problems.filter(p => p.includes('import order:')).length;
  duplicates += problems.filter(p => p.includes('duplicate import')).length;
}
console.log(`\nChecked ${files.length} tracked .ts/.tsx files: ${order} import-order violation(s), ${duplicates} duplicate-import violation(s) in ${affected} file(s).`);
process.exit(order + duplicates === 0 ? 0 : 1);
NODE
