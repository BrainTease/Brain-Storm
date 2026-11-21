import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const roots = ['apps', 'packages', '__tests__'];
const obsolete = [];

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;

    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__snapshots__') {
        obsolete.push({
          type: 'snapshot directory',
          path: relative(resolve('.'), path),
        });
      }
      walk(path);
      continue;
    }

    if (entry.name.endsWith('.snap')) {
      obsolete.push({
        type: 'snapshot file',
        path: relative(resolve('.'), path),
      });
      continue;
    }

    if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) continue;

    const content = readFileSync(path, 'utf8');
    if (/toMatch(?:Inline)?Snapshot\s*\(/.test(content)) {
      obsolete.push({
        type: 'snapshot matcher',
        path: relative(resolve('.'), path),
      });
    }
  }
}

for (const root of roots) {
  if (statExists(root)) walk(root);
}

function statExists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

if (obsolete.length > 0) {
  console.error('Obsolete Jest/Vitest snapshot artifacts found:');
  for (const item of obsolete) {
    console.error(`- ${item.type}: ${item.path}`);
  }
  process.exitCode = 1;
} else {
  console.log('Snapshot hygiene check passed: no Jest/Vitest snapshot artifacts found.');
}
