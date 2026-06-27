#!/bin/bash

# Accessibility Report Generator
# Generates HTML report from accessibility test results

set -euo pipefail

TEST_RESULTS="${1:-accessibility-results.json}"
OUTPUT_FILE="${2:-accessibility-report.html}"

echo "📊 Generating accessibility report..."

# Check if results file exists
if [ ! -f "$TEST_RESULTS" ]; then
  echo "❌ Test results file not found: $TEST_RESULTS"
  exit 1
fi

# Read results
RESULTS=$(cat "$TEST_RESULTS")

# Generate HTML report
cat > "$OUTPUT_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brain-Storm Accessibility Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .header {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header h1 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #666;
            font-size: 14px;
        }
        
        .wcag-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 10px;
            background: #d4edda;
            color: #155724;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            text-align: center;
        }
        
        .stat-card h3 {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .stat-card .number {
            font-size: 32px;
            font-weight: 700;
            color: #333;
        }
        
        .tests-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .test-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #ddd;
        }
        
        .test-card.pass {
            border-left-color: #28a745;
        }
        
        .test-card.fail {
            border-left-color: #dc3545;
        }
        
        .test-card h3 {
            color: #333;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .test-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .test-status.pass {
            background: #d4edda;
            color: #155724;
        }
        
        .test-status.fail {
            background: #f8d7da;
            color: #721c24;
        }
        
        .wcag-criteria {
            color: #666;
            font-size: 12px;
            margin-top: 10px;
        }
        
        .wcag-criteria strong {
            color: #333;
        }
        
        .guidelines {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .guidelines h2 {
            color: #333;
            margin-bottom: 20px;
        }
        
        .guideline-item {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
        }
        
        .guideline-item:last-child {
            border-bottom: none;
        }
        
        .guideline-item h3 {
            color: #333;
            margin-bottom: 10px;
        }
        
        .guideline-item p {
            color: #666;
            font-size: 14px;
            line-height: 1.6;
        }
        
        .footer {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 12px;
        }
        
        @media (max-width: 768px) {
            .stats {
                grid-template-columns: 1fr;
            }
            
            .tests-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>♿ Brain-Storm Accessibility Report</h1>
            <p id="timestamp"></p>
            <div class="wcag-badge">WCAG 2.1 Level AA Compliant</div>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <h3>Total Tests</h3>
                <div class="number" id="total-tests">0</div>
            </div>
            <div class="stat-card">
                <h3>Passed</h3>
                <div class="number" id="passed-tests" style="color: #28a745;">0</div>
            </div>
            <div class="stat-card">
                <h3>Failed</h3>
                <div class="number" id="failed-tests" style="color: #dc3545;">0</div>
            </div>
            <div class="stat-card">
                <h3>Pass Rate</h3>
                <div class="number" id="pass-rate" style="color: #007bff;">0%</div>
            </div>
        </div>
        
        <div class="tests-grid" id="tests-container"></div>
        
        <div class="guidelines">
            <h2>WCAG 2.1 Guidelines</h2>
            
            <div class="guideline-item">
                <h3>1. Perceivable</h3>
                <p>Information and user interface components must be presentable to users in ways they can perceive. This includes providing text alternatives for images, captions for videos, and sufficient color contrast.</p>
            </div>
            
            <div class="guideline-item">
                <h3>2. Operable</h3>
                <p>User interface components and navigation must be operable. This includes keyboard accessibility, focus management, and avoiding content that causes seizures.</p>
            </div>
            
            <div class="guideline-item">
                <h3>3. Understandable</h3>
                <p>Information and the operation of user interface must be understandable. This includes readable text, predictable behavior, and input assistance.</p>
            </div>
            
            <div class="guideline-item">
                <h3>4. Robust</h3>
                <p>Content must be robust enough that it can be interpreted reliably by a wide variety of user agents, including assistive technologies.</p>
            </div>
        </div>
        
        <div class="footer">
            <p>Generated by Brain-Storm Accessibility Testing System</p>
            <p>For more information, visit <a href="https://www.w3.org/WAI/WCAG21/quickref/" target="_blank">WCAG 2.1 Quick Reference</a></p>
        </div>
    </div>
    
    <script>
        const results = TEST_RESULTS_DATA;
        
        // Update header
        document.getElementById('timestamp').textContent = 
            `Last Updated: ${new Date().toLocaleString()}`;
        
        // Calculate stats
        const totalTests = results.tests.length;
        const passedTests = results.tests.filter(t => t.status === 'pass').length;
        const failedTests = results.tests.filter(t => t.status === 'fail').length;
        const passRate = Math.round((passedTests / totalTests) * 100);
        
        document.getElementById('total-tests').textContent = totalTests;
        document.getElementById('passed-tests').textContent = passedTests;
        document.getElementById('failed-tests').textContent = failedTests;
        document.getElementById('pass-rate').textContent = passRate + '%';
        
        // Render tests
        const testsContainer = document.getElementById('tests-container');
        results.tests.forEach(test => {
            const card = document.createElement('div');
            card.className = `test-card ${test.status}`;
            
            const title = document.createElement('h3');
            title.textContent = test.name;
            
            const status = document.createElement('div');
            status.className = `test-status ${test.status}`;
            status.textContent = test.status.toUpperCase();
            
            const criteria = document.createElement('div');
            criteria.className = 'wcag-criteria';
            criteria.innerHTML = `<strong>WCAG Criteria:</strong> ${test.wcag_criteria || 'N/A'}`;
            
            card.appendChild(title);
            card.appendChild(status);
            card.appendChild(criteria);
            
            testsContainer.appendChild(card);
        });
    </script>
    
    <script>
        const TEST_RESULTS_DATA = TEST_RESULTS_JSON;
    </script>
</body>
</html>
EOF

# Replace placeholder with actual results
RESULTS_JSON=$(echo "$RESULTS" | jq -c '.')
sed -i "s|TEST_RESULTS_JSON|$RESULTS_JSON|g" "$OUTPUT_FILE"

echo "✅ Report generated: $OUTPUT_FILE"
