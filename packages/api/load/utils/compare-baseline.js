#!/usr/bin/env node

/**
 * Compare load test results against baseline
 * Detects performance regressions
 */

const fs = require('fs');

// Configuration
const REGRESSION_THRESHOLD = 0.1; // 10% slower = regression
const WARNING_THRESHOLD = 0.05; // 5% slower = warning

/**
 * Load JSON file
 */
function loadJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (error) {
    console.error(`Error loading ${filepath}:`, error.message);
    process.exit(1);
  }
}

/**
 * Compare two values and determine status
 */
function compareMetric(current, baseline, lowerIsBetter = true) {
  if (!baseline || baseline === 0) {
    return { status: 'unknown', change: 0, changePercent: 0 };
  }

  const change = current - baseline;
  const changePercent = (change / baseline) * 100;

  let status;
  if (lowerIsBetter) {
    // For metrics like response time, lower is better
    if (changePercent > REGRESSION_THRESHOLD * 100) {
      status = 'regression';
    } else if (changePercent > WARNING_THRESHOLD * 100) {
      status = 'warning';
    } else if (changePercent < -WARNING_THRESHOLD * 100) {
      status = 'improvement';
    } else {
      status = 'acceptable';
    }
  } else {
    // For metrics like throughput, higher is better
    if (changePercent < -REGRESSION_THRESHOLD * 100) {
      status = 'regression';
    } else if (changePercent < -WARNING_THRESHOLD * 100) {
      status = 'warning';
    } else if (changePercent > WARNING_THRESHOLD * 100) {
      status = 'improvement';
    } else {
      status = 'acceptable';
    }
  }

  return { status, change, changePercent };
}

/**
 * Main comparison function
 */
function compareResults(currentFile, baselineFile) {
  const current = loadJSON(currentFile);
  const baseline = loadJSON(baselineFile);

  const comparison = {
    timestamp: new Date().toISOString(),
    current_file: currentFile,
    baseline_file: baselineFile,
    regression: false,
    warning: false,
    metrics: {},
    summary: {},
  };

  // Compare each metric
  const metricsToCompare = [
    { key: 'p95_response_time', name: 'P95 Response Time', lowerIsBetter: true, unit: 'ms' },
    { key: 'p99_response_time', name: 'P99 Response Time', lowerIsBetter: true, unit: 'ms' },
    { key: 'avg_response_time', name: 'Avg Response Time', lowerIsBetter: true, unit: 'ms' },
    { key: 'error_rate', name: 'Error Rate', lowerIsBetter: true, unit: '%' },
    { key: 'throughput', name: 'Throughput', lowerIsBetter: false, unit: 'req/s' },
  ];

  for (const metric of metricsToCompare) {
    const currentValue = current.metrics?.[metric.key] || 0;
    const baselineValue = baseline.metrics?.[metric.key] || 0;

    const result = compareMetric(currentValue, baselineValue, metric.lowerIsBetter);

    comparison.metrics[metric.key] = {
      name: metric.name,
      current: currentValue,
      baseline: baselineValue,
      change: result.change,
      changePercent: result.changePercent,
      status: result.status,
      unit: metric.unit,
    };

    if (result.status === 'regression') {
      comparison.regression = true;
    } else if (result.status === 'warning') {
      comparison.warning = true;
    }
  }

  // Generate summary
  const regressionCount = Object.values(comparison.metrics).filter(
    (m) => m.status === 'regression'
  ).length;
  const warningCount = Object.values(comparison.metrics).filter(
    (m) => m.status === 'warning'
  ).length;
  const improvementCount = Object.values(comparison.metrics).filter(
    (m) => m.status === 'improvement'
  ).length;

  comparison.summary = {
    regressions: regressionCount,
    warnings: warningCount,
    improvements: improvementCount,
    acceptable: metricsToCompare.length - regressionCount - warningCount - improvementCount,
    overall_status: comparison.regression ? 'FAIL' : comparison.warning ? 'WARNING' : 'PASS',
  };

  return comparison;
}

/**
 * Format comparison report
 */
function formatReport(comparison) {
  let report = '\n=== Load Test Baseline Comparison ===\n\n';

  report += `Overall Status: ${comparison.summary.overall_status}\n`;
  report += `Regressions: ${comparison.summary.regressions}\n`;
  report += `Warnings: ${comparison.summary.warnings}\n`;
  report += `Improvements: ${comparison.summary.improvements}\n`;
  report += `Acceptable: ${comparison.summary.acceptable}\n\n`;

  report += 'Metrics:\n';
  report += '-'.repeat(80) + '\n';

  for (const [key, metric] of Object.entries(comparison.metrics)) {
    const statusIcon =
      {
        regression: '❌',
        warning: '⚠️',
        improvement: '🎉',
        acceptable: '✅',
        unknown: '❓',
      }[metric.status] || '?';

    const changeSign = metric.change >= 0 ? '+' : '';
    const changeStr = `${changeSign}${metric.change.toFixed(2)}${metric.unit}`;
    const percentStr = `${changeSign}${metric.changePercent.toFixed(2)}%`;

    report += `${statusIcon} ${metric.name}:\n`;
    report += `   Current: ${metric.current.toFixed(2)}${metric.unit}\n`;
    report += `   Baseline: ${metric.baseline.toFixed(2)}${metric.unit}\n`;
    report += `   Change: ${changeStr} (${percentStr})\n\n`;
  }

  return report;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: compare-baseline.js <current-results.json> <baseline.json>');
    process.exit(1);
  }

  const [currentFile, baselineFile] = args;

  const comparison = compareResults(currentFile, baselineFile);

  // Output JSON for CI
  console.log(JSON.stringify(comparison, null, 2));

  // Output human-readable report to stderr
  console.error(formatReport(comparison));

  // Exit with error if regression detected
  if (comparison.regression) {
    process.exit(1);
  }
}

module.exports = { compareResults, formatReport };
