#!/usr/bin/env node
/**
 * Coverage enforcement script for API client modules
 * 
 * Ensures that lib/apiClient.ts, lib/api.ts, lib/forumApi.ts, and lib/adminApi.ts
 * maintain at least 85% coverage as required by issue #89.
 * 
 * Usage: node scripts/check-api-coverage.mjs
 * 
 * Exit codes:
 * - 0: All modules meet coverage threshold
 * - 1: One or more modules below threshold
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COVERAGE_THRESHOLD = 85;

const API_MODULES = [
  'src/lib/apiClient.ts',
  'src/lib/api.ts',
  'src/lib/forumApi.ts',
  'src/lib/adminApi.ts',
];

function loadCoverageSummary() {
  const coveragePath = resolve(__dirname, '../coverage/coverage-summary.json');
  
  if (!existsSync(coveragePath)) {
    console.error('❌ Coverage summary not found. Run tests with coverage first:');
    console.error('   npm run test:coverage');
    process.exit(1);
  }

  try {
    const content = readFileSync(coveragePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to parse coverage summary:', error.message);
    process.exit(1);
  }
}

function getModuleCoverage(coverageData, modulePath) {
  // Try to find the module in coverage data with different path variations
  const possiblePaths = [
    modulePath,
    resolve(__dirname, '..', modulePath),
    modulePath.replace(/\\/g, '/'),
  ];

  for (const path of possiblePaths) {
    if (coverageData[path]) {
      return coverageData[path];
    }
  }

  // Try partial match
  const moduleFile = modulePath.split('/').pop();
  for (const [path, data] of Object.entries(coverageData)) {
    if (path.endsWith(moduleFile)) {
      return data;
    }
  }

  return null;
}

function checkCoverage() {
  console.log('🔍 Checking API client module coverage...\n');

  const coverageData = loadCoverageSummary();
  const results = [];
  let allPassed = true;

  for (const modulePath of API_MODULES) {
    const moduleName = modulePath.replace('src/lib/', '');
    const coverage = getModuleCoverage(coverageData, modulePath);

    if (!coverage) {
      console.log(`⚠️  ${moduleName}: No coverage data found`);
      results.push({ module: moduleName, found: false });
      continue;
    }

    const metrics = {
      statements: coverage.statements.pct,
      branches: coverage.branches.pct,
      functions: coverage.functions.pct,
      lines: coverage.lines.pct,
    };

    const average = Object.values(metrics).reduce((a, b) => a + b, 0) / 4;
    const passed = average >= COVERAGE_THRESHOLD;

    if (passed) {
      console.log(`✅ ${moduleName}: ${average.toFixed(2)}% coverage`);
    } else {
      console.log(`❌ ${moduleName}: ${average.toFixed(2)}% coverage (required: ${COVERAGE_THRESHOLD}%)`);
      allPassed = false;
    }

    console.log(`   Lines: ${metrics.lines}% | Statements: ${metrics.statements}% | Functions: ${metrics.functions}% | Branches: ${metrics.branches}%`);
    console.log('');

    results.push({
      module: moduleName,
      found: true,
      coverage: average,
      passed,
      metrics,
    });
  }

  console.log('─'.repeat(60));

  if (allPassed) {
    console.log('✅ All API client modules meet the 85% coverage threshold!');
    return 0;
  } else {
    console.log('❌ Some API client modules are below the 85% coverage threshold.');
    console.log('\nTo fix:');
    console.log('1. Review the coverage report: open coverage/index.html');
    console.log('2. Add tests for uncovered lines in the failing modules');
    console.log('3. Run: npm run test:coverage');
    return 1;
  }
}

process.exit(checkCoverage());
