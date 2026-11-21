import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const runCount = Number(process.env.TEST_RERUN_COUNT ?? 20);
const command = process.argv.slice(2);

if (!Number.isInteger(runCount) || runCount < 1) {
  throw new Error('TEST_RERUN_COUNT must be a positive integer');
}

if (command.length === 0) {
  throw new Error('Provide a test command, for example: npm run test:unit:frontend');
}

const runs = [];
let failures = 0;

for (let run = 1; run <= runCount; run += 1) {
  const startedAt = Date.now();
  const executable =
    process.platform === 'win32' && command[0] === 'npm' ? 'npm.cmd' : command[0];
  const result = spawnSync(executable, command.slice(1), {
    cwd: resolve(process.cwd()),
    env: process.env,
    encoding: 'utf8',
    shell: false,
  });

  const passed = result.status === 0;
  if (!passed) failures += 1;
  runs.push({
    run,
    passed,
    exitCode: result.status,
    durationMs: Date.now() - startedAt,
  });

  process.stdout.write(passed ? `.` : `F`);
  if (run % 50 === 0) process.stdout.write('\n');
}

process.stdout.write('\n');

const reportDirectory = resolve('test-results');
mkdirSync(reportDirectory, { recursive: true });

const report = {
  command,
  runCount,
  passes: runCount - failures,
  failures,
  stable: failures === 0,
  runs,
};

writeFileSync(
  resolve(reportDirectory, 'rerun-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
);

const markdown = [
  '# Test rerun report',
  '',
  `- Command: \`${command.join(' ')}\``,
  `- Runs: ${runCount}`,
  `- Passes: ${runCount - failures}`,
  `- Failures: ${failures}`,
  `- Result: ${failures === 0 ? 'stable' : 'flaky or failing'}`,
  '',
  '| Run | Result | Exit code | Duration (ms) |',
  '| ---: | :---: | ---: | ---: |',
  ...runs.map((item) =>
    `| ${item.run} | ${item.passed ? 'PASS' : 'FAIL'} | ${item.exitCode ?? 'null'} | ${item.durationMs} |`,
  ),
  '',
].join('\n');

writeFileSync(resolve(reportDirectory, 'rerun-report.md'), markdown);

if (failures > 0) {
  process.exitCode = 1;
}
