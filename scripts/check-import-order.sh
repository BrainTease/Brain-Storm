#!/usr/bin/env bash
# Dependency-free static check for import group order and duplicate imports.
# Mirrors the group order configured in .eslintrc.js (simple-import-sort/imports)
# and import/no-duplicates, without requiring node_modules.
set -uo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "check-import-order.sh: node is required" >&2
  exit 2
fi

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
export IMPORT_CHECK_ROOT="$ROOT"

node <<'NODE'
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = process.env.IMPORT_CHECK_ROOT || process.cwd();

const IGNORED_DIRS = [
  'node_modules/', 'dist/', 'build/', 'coverage/', 'lib/', 'out/',
  '.next/', '.nuxt/', 'generated/', '__generated__/',
];

const files = execFileSync(
  'git',
  ['ls-files', '-z', '--', '*.ts', '*.tsx'],
  { cwd: root, maxBuffer: 64 * 1024 * 1024 },
)
  .toString()
  .split('\0')
  .filter(Boolean)
  .filter((f) => !f.endsWith('.d.ts'))
  .filter((f) => {
    const segments = f.split('/');
    return !IGNORED_DIRS.some((d) => segments.includes(d.replace(/\/$/, '')));
  });

const GROUP_LABEL = [
  'external',
  '@brain-storm/',
  'parent (../)',
  'sibling (./)',
  'unmatched/absolute (e.g. @/)',
];

// simple-import-sort assigns each import to the group whose regex matches the
// longest prefix. Anything unmatched goes into a final tail group.
function groupOf(source) {
  let bestGroup = 4;
  let bestLength = -1;
  const consider = (group, re) => {
    const match = re.exec(source);
    if (match && match[0].length > bestLength) {
      bestLength = match[0].length;
      bestGroup = group;
    }
  };
  consider(0, /^@?\w/);
  consider(1, /^@brain-storm\//);
  consider(2, /^\.\.(?!\/?$)/);
  consider(2, /^\.\.\/?$/);
  consider(3, /^\.\/(?=.*\/)(?!\/?$)/);
  consider(3, /^\.(?!\/?$)/);
  consider(3, /^\.\/?$/);
  return bestLength === -1 ? 4 : bestGroup;
}

const IMPORT_START = /^\s*import\b/;
const DYNAMIC_IMPORT = /^\s*import\s*\(/;
const FROM_CLAUSE = /\bfrom\s*['"]([^'"]+)['"]/;
const SIDE_EFFECT = /^\s*import\s*(?:type\s+)?['"]([^'"]+)['"]/;
const MAX_IMPORT_LINES = 60;

function isCommentLine(line) {
  return /^\s*(\/\/|\/\*|\*|\*\/)/.test(line);
}

function isBlank(line) {
  return line.trim() === '';
}

function parseImports(text) {
  const lines = text.split('\n');
  const imports = [];
  let i = 0;
  while (i < lines.length) {
    if (!IMPORT_START.test(lines[i]) || DYNAMIC_IMPORT.test(lines[i])) {
      i++;
      continue;
    }
    const startLine = i + 1;
    let block = lines[i];
    let last = i;
    while (last < lines.length - 1 && last - i < MAX_IMPORT_LINES) {
      if (FROM_CLAUSE.test(block) || SIDE_EFFECT.test(block)) break;
      last++;
      block += '\n' + lines[last];
    }
    const fromMatch = FROM_CLAUSE.exec(block);
    const sideMatch = SIDE_EFFECT.exec(block);
    const source = fromMatch ? fromMatch[1] : sideMatch ? sideMatch[1] : null;
    if (source) {
      imports.push({
        line: startLine,
        endLine: last + 1,
        source,
        sideEffect: !fromMatch && !!sideMatch,
        chunk: 0,
      });
    }
    i = last + 1;
  }

  // Assign chunk ids: imports separated only by blank/comment lines stay in
  // the same chunk (this is how simple-import-sort scopes its sorting).
  let chunk = 0;
  for (let idx = 0; idx < imports.length; idx++) {
    if (idx > 0) {
      const prev = imports[idx - 1];
      const between = lines.slice(prev.endLine, imports[idx].line - 1);
      const onlyTrivia = between.every((l) => isBlank(l) || isCommentLine(l));
      if (!onlyTrivia) chunk++;
    }
    imports[idx].chunk = chunk;
  }
  return imports;
}

let orderViolations = 0;
let duplicateViolations = 0;
let filesAffected = 0;

for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const imports = parseImports(text);
  if (imports.length === 0) continue;

  const problems = [];

  const byChunk = new Map();
  for (const imp of imports) {
    if (!byChunk.has(imp.chunk)) byChunk.set(imp.chunk, []);
    byChunk.get(imp.chunk).push(imp);
  }
  for (const [chunkId, chunkImports] of byChunk) {
    let maxGroup = -1;
    for (const imp of chunkImports) {
      // Side-effect imports are pinned by their load-order semantics, so they
      // start a fresh ordering segment instead of constraining other imports.
      if (imp.sideEffect) {
        maxGroup = -1;
        continue;
      }
      const group = groupOf(imp.source);
      if (group < maxGroup) {
        problems.push({
          line: imp.line,
          message:
            `import group out of order: '${imp.source}' (${GROUP_LABEL[group]}) ` +
            `appears after ${GROUP_LABEL[maxGroup]}`,
        });
      }
      if (group > maxGroup) maxGroup = group;
    }
    void chunkId;
  }

  const bySource = new Map();
  for (const imp of imports) {
    if (!bySource.has(imp.source)) bySource.set(imp.source, []);
    bySource.get(imp.source).push(imp);
  }
  for (const [source, occurrences] of bySource) {
    if (occurrences.length < 2) continue;
    for (const dup of occurrences.slice(1)) {
      problems.push({
        line: dup.line,
        message:
          `duplicate import from '${source}' (first occurrence at line ` +
          `${occurrences[0].line})`,
      });
    }
  }

  if (problems.length === 0) continue;
  filesAffected++;
  problems
    .slice()
    .sort((a, b) => a.line - b.line)
    .forEach((p) => console.log(`${file}:${p.line}: ${p.message}`));
  orderViolations += problems.filter((p) => p.message.startsWith('import group')).length;
  duplicateViolations += problems.filter((p) => p.message.startsWith('duplicate import')).length;
}

console.log(
  `\nChecked ${files.length} tracked .ts/.tsx files: ` +
    `${orderViolations} import-order violation(s), ` +
    `${duplicateViolations} duplicate-import violation(s) in ${filesAffected} file(s).`,
);
process.exit(orderViolations + duplicateViolations === 0 ? 0 : 1);
NODE
