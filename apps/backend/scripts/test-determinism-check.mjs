#!/usr/bin/env node
/**
 * Deterministic Test Validation Script
 * 
 * Runs HTTP integration tests 20 consecutive times to ensure they are
 * deterministic and not flaky. Tracks pass/fail for each run and reports
 * any failures.
 * 
 * Usage: node scripts/test-determinism-check.mjs
 * 
 * Exit codes:
 * - 0: All runs passed
 * - 1: One or more runs failed
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const RUNS = process.env.TEST_RERUN_COUNT ? parseInt(process.env.TEST_RERUN_COUNT, 10) : 20;
const TEST_COMMAND = 'npm run test:http-integration';

async function runTests(runNumber) {
  const startTime = Date.now();
  
  try {
    await execAsync(TEST_COMMAND, {
      cwd: resolve(__dirname, '..'),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    const duration = Date.now() - startTime;
    return {
      run: runNumber,
      passed: true,
      duration,
      error: null,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      run: runNumber,
      passed: false,
      duration,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr,
    };
  }
}

async function main() {
  console.log('🧪 Starting Deterministic Test Validation');
  console.log(`📊 Running tests ${RUNS} consecutive times...\n`);

  const results = [];
  let passCount = 0;
  let failCount = 0;

  for (let i = 1; i <= RUNS; i++) {
    process.stdout.write(`Run ${i}/${RUNS}... `);
    
    const result = await runTests(i);
    results.push(result);

    if (result.passed) {
      passCount++;
      console.log(`✅ PASSED (${result.duration}ms)`);
    } else {
      failCount++;
      console.log(`❌ FAILED (${result.duration}ms)`);
    }
  }

  // Calculate statistics
  const durations = results.map(r => r.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Runs:    ${RUNS}`);
  console.log(`Passed:        ${passCount} (${((passCount / RUNS) * 100).toFixed(1)}%)`);
  console.log(`Failed:        ${failCount} (${((failCount / RUNS) * 100).toFixed(1)}%)`);
  console.log(`\nDuration Stats:`);
  console.log(`  Average:     ${avgDuration.toFixed(0)}ms`);
  console.log(`  Min:         ${minDuration}ms`);
  console.log(`  Max:         ${maxDuration}ms`);
  console.log('='.repeat(60));

  // Report failures
  if (failCount > 0) {
    console.log('\n❌ FAILED RUNS:');
    results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`\nRun #${r.run}:`);
        console.log(`  Error: ${r.error}`);
        if (r.stderr) {
          console.log(`  Stderr: ${r.stderr.substring(0, 500)}...`);
        }
      });
  }

  // Generate report file
  const report = {
    timestamp: new Date().toISOString(),
    runs: RUNS,
    passCount,
    failCount,
    passRate: ((passCount / RUNS) * 100).toFixed(2) + '%',
    avgDuration: avgDuration.toFixed(0) + 'ms',
    minDuration: minDuration + 'ms',
    maxDuration: maxDuration + 'ms',
    results: results.map(r => ({
      run: r.run,
      passed: r.passed,
      duration: r.duration + 'ms',
      error: r.error || null,
    })),
  };

  const reportPath = resolve(__dirname, '../test-determinism-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report written to: test-determinism-report.json`);

  // Generate markdown report
  const mdReport = generateMarkdownReport(report);
  const mdReportPath = resolve(__dirname, '../test-determinism-report.md');
  writeFileSync(mdReportPath, mdReport);
  console.log(`📄 Markdown report written to: test-determinism-report.md`);

  // Exit with appropriate code
  if (failCount > 0) {
    console.log('\n⚠️  Tests failed on one or more runs. Investigate flakiness.');
    process.exit(1);
  } else {
    console.log('\n✅ All test runs passed! Tests are deterministic.');
    process.exit(0);
  }
}

function generateMarkdownReport(report) {
  return `# Test Determinism Report

**Generated:** ${report.timestamp}

## Summary

| Metric | Value |
|--------|-------|
| Total Runs | ${report.runs} |
| Passed | ${report.passCount} (${report.passRate}) |
| Failed | ${report.failCount} |
| Avg Duration | ${report.avgDuration} |
| Min Duration | ${report.minDuration} |
| Max Duration | ${report.maxDuration} |

## Results

${report.results.map(r => `- Run #${r.run}: ${r.passed ? '✅ PASSED' : '❌ FAILED'} (${r.duration})${r.error ? ` - ${r.error}` : ''}`).join('\n')}

## Conclusion

${report.failCount === 0 
  ? '✅ All test runs passed successfully. Tests are deterministic and stable.' 
  : `⚠️ ${report.failCount} run(s) failed. Tests may be flaky and require investigation.`
}
`;
}

// Run the validation
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
