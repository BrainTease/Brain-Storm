#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const REGRESSION_THRESHOLD = 0.1; // 10% regression threshold
const ALERT_THRESHOLD = 0.05; // 5% warning threshold

function parseK6Results(jsonFile) {
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const metrics = {};

  if (data.metrics) {
    Object.entries(data.metrics).forEach(([key, metric]) => {
      if (metric.values) {
        metrics[key] = {
          min: metric.values.min,
          max: metric.values.max,
          avg: metric.values.avg,
          med: metric.values.med,
          p95: metric.values['p(95)'],
          p99: metric.values['p(99)'],
        };
      }
    });
  }

  return metrics;
}

function compareMetrics(current, baseline) {
  const results = {
    regressions: [],
    warnings: [],
    improvements: [],
    timestamp: new Date().toISOString(),
  };

  const criticalMetrics = [
    'http_req_duration',
    'http_req_failed',
    'http_reqs',
  ];

  criticalMetrics.forEach(metric => {
    if (!current[metric] || !baseline[metric]) return;

    const currentVal = current[metric].p95 || current[metric].avg;
    const baselineVal = baseline[metric].p95 || baseline[metric].avg;

    if (!currentVal || !baselineVal) return;

    const changePercent = ((currentVal - baselineVal) / baselineVal) * 100;

    if (changePercent > REGRESSION_THRESHOLD * 100) {
      results.regressions.push({
        metric,
        baseline: baselineVal,
        current: currentVal,
        change_percent: changePercent.toFixed(2),
        severity: changePercent > REGRESSION_THRESHOLD * 100 * 2 ? 'critical' : 'high',
      });
    } else if (changePercent > ALERT_THRESHOLD * 100) {
      results.warnings.push({
        metric,
        baseline: baselineVal,
        current: currentVal,
        change_percent: changePercent.toFixed(2),
      });
    } else if (changePercent < -ALERT_THRESHOLD * 100) {
      results.improvements.push({
        metric,
        baseline: baselineVal,
        current: currentVal,
        change_percent: changePercent.toFixed(2),
      });
    }
  });

  return results;
}

function generateReport(results) {
  let report = '\n📊 Load Test Baseline Comparison Report\n';
  report += '='.repeat(50) + '\n';
  report += `Timestamp: ${results.timestamp}\n\n`;

  if (results.regressions.length > 0) {
    report += '🚨 REGRESSIONS DETECTED:\n';
    results.regressions.forEach(r => {
      report += `  • ${r.metric}: ${r.change_percent}% (${r.baseline} → ${r.current}) [${r.severity}]\n`;
    });
    report += '\n';
  }

  if (results.warnings.length > 0) {
    report += '⚠️  WARNINGS:\n';
    results.warnings.forEach(w => {
      report += `  • ${w.metric}: ${w.change_percent}% (${w.baseline} → ${w.current})\n`;
    });
    report += '\n';
  }

  if (results.improvements.length > 0) {
    report += '✅ IMPROVEMENTS:\n';
    results.improvements.forEach(i => {
      report += `  • ${i.metric}: ${i.change_percent}% (${i.baseline} → ${i.current})\n`;
    });
    report += '\n';
  }

  if (results.regressions.length === 0 && results.warnings.length === 0) {
    report += '✅ All metrics within acceptable thresholds\n\n';
  }

  return report;
}

function main() {
  const resultsDir = process.env.RESULTS_DIR || './load-test-results';
  const baselinesFile = process.env.BASELINES_FILE || './scripts/load-tests/baselines/performance-baselines.json';

  if (!fs.existsSync(baselinesFile)) {
    console.error(`❌ Baselines file not found: ${baselinesFile}`);
    process.exit(1);
  }

  const baselines = JSON.parse(fs.readFileSync(baselinesFile, 'utf8'));
  const testFiles = fs.readdirSync(resultsDir).filter(f => f.endsWith('.json'));

  let hasRegressions = false;
  let allResults = {
    timestamp: new Date().toISOString(),
    tests: [],
  };

  testFiles.forEach(file => {
    const filePath = path.join(resultsDir, file);
    const testName = file.replace('.json', '');

    try {
      const currentMetrics = parseK6Results(filePath);
      const baselineMetrics = baselines.scenarios[testName] || {};

      const comparison = compareMetrics(currentMetrics, baselineMetrics);
      const report = generateReport(comparison);

      console.log(report);

      allResults.tests.push({
        name: testName,
        ...comparison,
      });

      if (comparison.regressions.length > 0) {
        hasRegressions = true;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}: ${error.message}`);
    }
  });

  // Save detailed report
  const reportPath = path.join(resultsDir, 'baseline-comparison-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(allResults, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);

  process.exit(hasRegressions ? 1 : 0);
}

main();
