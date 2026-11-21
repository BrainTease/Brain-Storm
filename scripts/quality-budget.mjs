#!/usr/bin/env node
/**
 * Quality budget ratchet (#1532, #1533, #1534).
 *
 * Runs the TypeScript and ESLint checks for the frontend and backend and
 * compares the violation counts with `scripts/quality-budget.json`.
 *
 * - The budget may only go down. Any increase fails the command.
 * - Module-resolution diagnostics (TS2307) are reported but excluded from the
 *   budget: they describe missing modules in the snapshot, not strict-mode or
 *   lint violations.
 * - `--update` rewrites the budget with the current counts.
 * - `--staged` only checks projects that have staged TypeScript files, so it
 *   is suitable for a pre-commit hook.
 *
 * Usage:
 *   node scripts/quality-budget.mjs
 *   node scripts/quality-budget.mjs --project frontend
 *   node scripts/quality-budget.mjs --update
 *   node scripts/quality-budget.mjs --staged
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET_PATH = path.join(ROOT, 'scripts', 'quality-budget.json');
const MODULE_RESOLUTION_CODE = 'TS2307';

const args = process.argv.slice(2);
const update = args.includes('--update');
const staged = args.includes('--staged');
const projectArgIndex = args.indexOf('--project');
const projectArg = projectArgIndex >= 0 ? args[projectArgIndex + 1] : undefined;

const budget = JSON.parse(readFileSync(BUDGET_PATH, 'utf8'));

function resolveBin(relativePath, fallback) {
  const absolute = path.join(ROOT, relativePath);
  return existsSync(absolute) ? absolute : fallback;
}

const TSC_BIN = resolveBin('node_modules/typescript/bin/tsc', 'tsc');
const ESLINT_BIN = resolveBin('node_modules/eslint/bin/eslint.js', 'eslint');

function runTypecheck(project) {
  const cwd = path.join(ROOT, project.directory);
  const result = spawnSync(process.execPath, [TSC_BIN, '--noEmit', '-p', 'tsconfig.json'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  const codes = [...output.matchAll(/error (TS\d+)/g)].map((match) => match[1]);
  const moduleResolution = codes.filter((code) => code === MODULE_RESOLUTION_CODE).length;

  return {
    exitCode: result.status ?? 1,
    total: codes.length,
    moduleResolution,
    excludingModuleResolution: codes.length - moduleResolution,
    output,
  };
}

function runEslint(project, trackedRules) {
  const cwd = path.join(ROOT, project.directory);
  const result = spawnSync(
    process.execPath,
    [ESLINT_BIN, ...project.eslintTargets, '--ext', '.ts,.tsx', '-f', 'json'],
    { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );

  const counts = Object.fromEntries(trackedRules.map((rule) => [rule, 0]));
  let parseError;

  try {
    const report = JSON.parse(result.stdout || '[]');
    for (const file of report) {
      for (const message of file.messages ?? []) {
        if (message.ruleId in counts) counts[message.ruleId] += 1;
      }
    }
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }

  return {
    exitCode: result.status ?? 1,
    counts,
    parseError,
    stderr: result.stderr ?? '',
  };
}

function stagedProjects() {
  if (!staged) return Object.keys(budget.projects);

  let changed = '';
  try {
    changed = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  } catch {
    return [];
  }

  return Object.entries(budget.projects)
    .filter(([, project]) =>
      changed
        .split('\n')
        .filter(Boolean)
        .some(
          (file) =>
            file.startsWith(`${project.directory}/`) && /\.(ts|tsx|js|jsx)$/.test(file)
        )
    )
    .map(([name]) => name);
}

const names = projectArg
  ? [projectArg]
  : staged
    ? stagedProjects()
    : Object.keys(budget.projects);

if (projectArg && !budget.projects[projectArg]) {
  console.error(`Unknown project "${projectArg}". Expected one of: ${Object.keys(budget.projects).join(', ')}`);
  process.exit(2);
}

if (names.length === 0) {
  console.log('Quality budget: no matching staged TypeScript files, skipping.');
  process.exit(0);
}

const failures = [];
let budgetChanged = false;

for (const name of names) {
  const project = budget.projects[name];
  const recorded = project;
  console.log(`\n── ${name} ─────────────────────────────────────────────`);

  const typescript = runTypecheck(project);
  console.log(
    `TypeScript: ${typescript.total} diagnostics ` +
      `(${typescript.moduleResolution} module-resolution, ` +
      `${typescript.excludingModuleResolution} counted)`
  );

  if (update) {
    recorded.typecheck.excludingModuleResolution = typescript.excludingModuleResolution;
    budgetChanged = true;
  } else if (typescript.excludingModuleResolution > recorded.typecheck.excludingModuleResolution) {
    failures.push(
      `${name}: TypeScript violations grew from ${recorded.typecheck.excludingModuleResolution} ` +
        `to ${typescript.excludingModuleResolution}`
    );
  } else if (typescript.excludingModuleResolution < recorded.typecheck.excludingModuleResolution) {
    console.log(
      `  ✓ improved (budget ${recorded.typecheck.excludingModuleResolution}); ` +
        'run `npm run quality:update` to lower it'
    );
  }

  const eslint = runEslint(project, budget.trackedEslintRules);
  if (eslint.parseError) {
    console.error(`ESLint output could not be parsed: ${eslint.parseError}`);
    console.error(eslint.stderr.split('\n').slice(-10).join('\n'));
    failures.push(`${name}: ESLint did not run`);
    continue;
  }

  for (const rule of budget.trackedEslintRules) {
    const count = eslint.counts[rule] ?? 0;
    const limit = recorded.eslint[rule] ?? 0;
    console.log(`${rule}: ${count} (budget ${limit})`);

    if (update) {
      recorded.eslint[rule] = count;
      budgetChanged = true;
    } else if (count > limit) {
      failures.push(`${name}: ${rule} grew from ${limit} to ${count}`);
    }
  }
}

if (update && budgetChanged) {
  writeFileSync(BUDGET_PATH, `${JSON.stringify(budget, null, 2)}\n`);
  console.log(`\nUpdated ${path.relative(ROOT, BUDGET_PATH)}.`);
}

if (failures.length > 0) {
  console.error('\n✗ Quality budget exceeded:');
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    '\nFix the new violations. If a new violation is genuinely unavoidable, document it in ' +
      'docs/quality-gates.md and update the budget in the same reviewed change.'
  );
  process.exit(1);
}

console.log('\n✓ Quality budget is within the recorded baseline.');
