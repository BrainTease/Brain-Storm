#!/usr/bin/env node
/**
 * Type-safe env/config access audit (#1551).
 *
 * Records the baseline of direct `process.env` reads and fails when application
 * code bypasses its config module. Run locally with `npm run check:env`, or with
 * `--staged` from the pre-commit hook to check only files about to be committed.
 *
 * Justified exceptions (documented in docs/environment-variables.md):
 *   - config modules: the single place allowed to read the environment
 *   - tests/fixtures/e2e: they deliberately vary env values per case
 *   - build tooling (*.config.js/ts, scripts/): runs before app config exists
 *   - backend non-secret operational reads outside config are out of scope for
 *     the secret-read ESLint rule; this script mirrors that rule exactly.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stagedOnly = process.argv.includes('--staged');

const SECRET_NAME = /(SECRET|TOKEN|PASSWORD|KEY|CREDENTIAL|PRIVATE)/i;
const ENV_READ = /\bprocess\s*\.\s*env\s*(?:\.\s*([A-Za-z0-9_$]+)|\[\s*['"`]?([A-Za-z0-9_$]+))?/g;

function walk(dir, extensions, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, extensions, out);
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function isTestFile(relative) {
  const normalized = relative.split(path.sep).join('/');
  return (
    /(^|\/)(__tests__|e2e|tests|test)\//.test(normalized) ||
    /[.-](test|spec)\.[cm]?[jt]sx?$/.test(normalized)
  );
}

function isBuildConfig(relative) {
  return /\.config\.[cm]?[jt]sx?$/.test(relative) || /(^|\/)\.eslintrc\.js$/.test(relative);
}

function parseFiles() {
  if (!stagedOnly) {
    return [
      ...walk(path.join(ROOT, 'apps/frontend/src'), ['.ts', '.tsx']),
      ...walk(path.join(ROOT, 'apps/frontend'), ['.ts', '.tsx', '.js']),
      ...walk(path.join(ROOT, 'apps/backend/src'), ['.ts']),
      ...walk(path.join(ROOT, 'packages'), ['.ts', '.tsx']),
    ].filter((file, index, files) => files.indexOf(file) === index);
  }

  const output = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^((apps|packages)\/|scripts\/)/.test(line))
    .filter((line) => /\.[cm]?[jt]sx?$/.test(line))
    .map((line) => path.join(ROOT, line))
    .filter((file) => fs.existsSync(file));
}

function stripComments(line) {
  return line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '');
}

function checkFile(file) {
  const relative = path.relative(ROOT, file).split(path.sep).join('/');
  const inConfigDir = /(^|\/)src\/config\//.test(relative);
  const testFile = isTestFile(relative);
  const buildConfig = isBuildConfig(relative);
  const frontendApp = relative.startsWith('apps/frontend/');
  const backendApp = relative.startsWith('apps/backend/');
  const packageCode = relative.startsWith('packages/');

  const violations = [];
  const source = fs.readFileSync(file, 'utf8');
  source.split(/\r?\n/).forEach((rawLine, index) => {
    const line = stripComments(rawLine);
    ENV_READ.lastIndex = 0;
    let match;
    while ((match = ENV_READ.exec(line)) !== null) {
      const name = match[1] || match[2] || '';
      let violation = false;

      if (inConfigDir || testFile || buildConfig) {
        violation = false;
      } else if (frontendApp || packageCode) {
        // The frontend and packages must never read the environment directly.
        violation = true;
      } else if (backendApp && SECRET_NAME.test(name)) {
        // Backend: mirror the existing secret-shaped ESLint rule.
        violation = true;
      }

      if (violation) {
        violations.push({ line: index + 1, name: name || '(computed)' });
      }
    }
  });

  return { relative, violations };
}

const files = parseFiles();
const results = files.map(checkFile).filter((result) => result.violations.length > 0);

console.log('Type-safe env/config access audit (#1551)');
console.log(`Scanned ${files.length} file(s)${stagedOnly ? ' (staged only)' : ''}.`);

if (results.length === 0) {
  console.log('No direct process.env access in application code. ✓');
  process.exit(0);
}

console.error('\nDirect process.env access found outside a config module:');
for (const { relative, violations } of results) {
  for (const { line, name } of violations) {
    console.error(`  ${relative}:${line}  process.env.${name}`);
  }
}
console.error(
  '\nRead values through getConfig() (frontend), a src/config module (backend/packages),\n' +
    'or add a documented exception in docs/environment-variables.md.',
);
process.exit(1);
