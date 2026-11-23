#!/usr/bin/env node
/**
 * Coverage enforcement script for dashboard components
 * 
 * Ensures that all components in src/components/dashboard/ maintain at least
 * 85% coverage as required by issue #90.
 * 
 * Usage: node scripts/check-dashboard-coverage.mjs
 * 
 * Exit codes:
 * - 0: All components meet coverage threshold
 * - 1: One or more components below threshold
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const COVERAGE_THRESHOLD = 85;

const DASHBOARD_COMPONENTS = [
  'src/components/dashboard/QuickStats.tsx',
  'src/components/dashboard/CourseProgressList.tsx',
  'src/components/dashboard/EnrolledCourseList.tsx',
  'src/components/dashboard/CredentialGrid.tsx',
  'src/components/dashboard/TokenBalanceCard.tsx',
  'src/components/dashboard/LearningAnalyticsSection.tsx',
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

function getComponentCoverage(coverageData, componentPath) {
  // Try to find the component in coverage data with different path variations
  const possiblePaths = [
    componentPath,
    resolve(__dirname, '..', componentPath),
    componentPath.replace(/\\/g, '/'),
  ];

  for (const path of possiblePaths) {
    if (coverageData[path]) {
      return coverageData[path];
    }
  }

  // Try partial match
  const componentFile = componentPath.split('/').pop();
  for (const [path, data] of Object.entries(coverageData)) {
    if (path.endsWith(componentFile)) {
      return data;
    }
  }

  return null;
}

function checkCoverage() {
  console.log('🔍 Checking dashboard component coverage...\n');

  const coverageData = loadCoverageSummary();
  const results = [];
  let allPassed = true;

  for (const componentPath of DASHBOARD_COMPONENTS) {
    const componentName = componentPath.replace('src/components/dashboard/', '');
    const coverage = getComponentCoverage(coverageData, componentPath);

    if (!coverage) {
      console.log(`⚠️  ${componentName}: No coverage data found`);
      results.push({ component: componentName, found: false });
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
      console.log(`✅ ${componentName}: ${average.toFixed(2)}% coverage`);
    } else {
      console.log(`❌ ${componentName}: ${average.toFixed(2)}% coverage (required: ${COVERAGE_THRESHOLD}%)`);
      allPassed = false;
    }

    console.log(`   Lines: ${metrics.lines}% | Statements: ${metrics.statements}% | Functions: ${metrics.functions}% | Branches: ${metrics.branches}%`);
    console.log('');

    results.push({
      component: componentName,
      found: true,
      coverage: average,
      passed,
      metrics,
    });
  }

  console.log('─'.repeat(60));

  if (allPassed) {
    console.log('✅ All dashboard components meet the 85% coverage threshold!');
    return 0;
  } else {
    console.log('❌ Some dashboard components are below the 85% coverage threshold.');
    console.log('\nTo fix:');
    console.log('1. Review the coverage report: open coverage/index.html');
    console.log('2. Add tests for uncovered lines in the failing components');
    console.log('3. Run: npm run test:coverage');
    return 1;
  }
}

process.exit(checkCoverage());
