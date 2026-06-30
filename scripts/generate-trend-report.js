#!/usr/bin/env node

/**
 * Generate trend report from multiple load test results
 * Shows performance trends over time
 */

const fs = require('fs');
const path = require('path');

function loadAllResults(resultsDir) {
  const results = [];
  
  function traverse(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filepath = path.join(dir, file);
      const stat = fs.statSync(filepath);
      
      if (stat.isDirectory()) {
        traverse(filepath);
      } else if (file.endsWith('-parsed.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
          results.push({
            file: filepath,
            scenario: file.replace('-parsed.json', ''),
            ...data,
          });
        } catch (error) {
          console.error(`Error loading ${filepath}:`, error.message);
        }
      }
    }
  }
  
  traverse(resultsDir);
  return results;
}

function generateTrendReport(results) {
  let report = '# Load Test Trend Report\n\n';
  report += `**Generated**: ${new Date().toISOString()}\n\n`;
  
  // Group by scenario
  const scenarios = {};
  for (const result of results) {
    if (!scenarios[result.scenario]) {
      scenarios[result.scenario] = [];
    }
    scenarios[result.scenario].push(result);
  }
  
  // Generate report for each scenario
  for (const [scenario, scenarioResults] of Object.entries(scenarios)) {
    report += `## ${scenario.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\n`;
    
    if (scenarioResults.length === 0) {
      report += 'No results available.\n\n';
      continue;
    }
    
    // Sort by timestamp
    scenarioResults.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Latest result
    const latest = scenarioResults[scenarioResults.length - 1];
    
    report += '### Latest Results\n\n';
    report += '| Metric | Value |\n';
    report += '|--------|-------|\n';
    
    for (const [key, value] of Object.entries(latest.metrics || {})) {
      const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const displayValue = typeof value === 'number' ? value.toFixed(2) : value;
      report += `| ${displayKey} | ${displayValue} |\n`;
    }
    
    report += '\n';
    
    // Trend analysis (if multiple results)
    if (scenarioResults.length > 1) {
      report += '### Trend Analysis\n\n';
      
      const oldest = scenarioResults[0];
      const metrics = Object.keys(latest.metrics || {});
      
      report += '| Metric | Oldest | Latest | Change | Trend |\n';
      report += '|--------|--------|--------|--------|-------|\n';
      
      for (const metric of metrics) {
        const oldValue = oldest.metrics?.[metric] || 0;
        const newValue = latest.metrics?.[metric] || 0;
        const change = newValue - oldValue;
        const changePercent = oldValue !== 0 ? ((change / oldValue) * 100).toFixed(2) : 'N/A';
        
        let trend = '→';
        if (change > 0) trend = '↑';
        if (change < 0) trend = '↓';
        
        // For response time and error rate, down is good
        if (metric.includes('time') || metric.includes('error')) {
          if (change > 0) trend += ' ⚠️';
          if (change < -oldValue * 0.1) trend += ' ✅';
        } else {
          // For throughput, up is good
          if (change < 0) trend += ' ⚠️';
          if (change > oldValue * 0.1) trend += ' ✅';
        }
        
        const displayKey = metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        report += `| ${displayKey} | ${oldValue.toFixed(2)} | ${newValue.toFixed(2)} | ${change.toFixed(2)} (${changePercent}%) | ${trend} |\n`;
      }
      
      report += '\n';
    }
    
    // Historical data summary
    if (scenarioResults.length > 2) {
      report += '### Historical Summary\n\n';
      report += `- **Total Runs**: ${scenarioResults.length}\n`;
      report += `- **Date Range**: ${new Date(scenarioResults[0].timestamp).toLocaleDateString()} to ${new Date(latest.timestamp).toLocaleDateString()}\n`;
      
      // Calculate averages
      const avgMetrics = {};
      for (const metric of Object.keys(latest.metrics || {})) {
        const values = scenarioResults.map(r => r.metrics?.[metric] || 0);
        const sum = values.reduce((a, b) => a + b, 0);
        avgMetrics[metric] = sum / values.length;
      }
      
      report += '\n**Average Values**:\n\n';
      for (const [key, value] of Object.entries(avgMetrics)) {
        const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        report += `- ${displayKey}: ${value.toFixed(2)}\n`;
      }
      
      report += '\n';
    }
  }
  
  // Overall summary
  report += '## Overall Summary\n\n';
  report += `- **Total Scenarios Tested**: ${Object.keys(scenarios).length}\n`;
  report += `- **Total Test Runs**: ${results.length}\n`;
  
  // Check for any concerning trends
  const concerns = [];
  for (const [scenario, scenarioResults] of Object.entries(scenarios)) {
    if (scenarioResults.length > 1) {
      const latest = scenarioResults[scenarioResults.length - 1];
      const previous = scenarioResults[scenarioResults.length - 2];
      
      // Check for response time increase
      const p95Latest = latest.metrics?.p95_response_time || 0;
      const p95Previous = previous.metrics?.p95_response_time || 0;
      
      if (p95Latest > p95Previous * 1.2) {
        concerns.push(`${scenario}: P95 response time increased by ${((p95Latest / p95Previous - 1) * 100).toFixed(1)}%`);
      }
      
      // Check for error rate increase
      const errorLatest = latest.metrics?.error_rate || 0;
      const errorPrevious = previous.metrics?.error_rate || 0;
      
      if (errorLatest > errorPrevious * 2 && errorLatest > 1) {
        concerns.push(`${scenario}: Error rate doubled to ${errorLatest.toFixed(2)}%`);
      }
    }
  }
  
  if (concerns.length > 0) {
    report += '\n### ⚠️ Concerns\n\n';
    for (const concern of concerns) {
      report += `- ${concern}\n`;
    }
  } else {
    report += '\n✅ No significant performance concerns detected.\n';
  }
  
  return report;
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: generate-trend-report.js <results-directory>');
    process.exit(1);
  }
  
  const resultsDir = args[0];
  
  if (!fs.existsSync(resultsDir)) {
    console.error(`Directory not found: ${resultsDir}`);
    process.exit(1);
  }
  
  const results = loadAllResults(resultsDir);
  const report = generateTrendReport(results);
  
  console.log(report);
}

module.exports = { loadAllResults, generateTrendReport };
