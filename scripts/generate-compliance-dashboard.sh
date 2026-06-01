#!/bin/bash

# Compliance Dashboard Generator
# Creates HTML dashboard from compliance reports

set -euo pipefail

REPORT_FILE="${1:-compliance-report.json}"
OUTPUT_FILE="${2:-compliance-dashboard.html}"

echo "📊 Generating compliance dashboard..."

# Check if report exists
if [ ! -f "$REPORT_FILE" ]; then
  echo "❌ Report file not found: $REPORT_FILE"
  exit 1
fi

# Read report
REPORT=$(cat "$REPORT_FILE")

# Generate HTML
cat > "$OUTPUT_FILE" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Brain-Storm Compliance Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
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
        
        .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin-top: 10px;
        }
        
        .status-pass {
            background: #d4edda;
            color: #155724;
        }
        
        .status-fail {
            background: #f8d7da;
            color: #721c24;
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
        
        .rules-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        
        .rule-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #ddd;
        }
        
        .rule-card.pass {
            border-left-color: #28a745;
        }
        
        .rule-card.fail {
            border-left-color: #dc3545;
        }
        
        .rule-card h3 {
            color: #333;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .rule-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        
        .rule-status.pass {
            background: #d4edda;
            color: #155724;
        }
        
        .rule-status.fail {
            background: #f8d7da;
            color: #721c24;
        }
        
        .violations {
            color: #666;
            font-size: 14px;
            margin-top: 10px;
        }
        
        .violations strong {
            color: #dc3545;
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
            
            .rules-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔒 Brain-Storm Compliance Dashboard</h1>
            <p id="timestamp"></p>
            <div id="overall-status"></div>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <h3>Total Rules</h3>
                <div class="number" id="total-rules">0</div>
            </div>
            <div class="stat-card">
                <h3>Passed</h3>
                <div class="number" id="passed-rules" style="color: #28a745;">0</div>
            </div>
            <div class="stat-card">
                <h3>Failed</h3>
                <div class="number" id="failed-rules" style="color: #dc3545;">0</div>
            </div>
            <div class="stat-card">
                <h3>Total Violations</h3>
                <div class="number" id="total-violations" style="color: #ffc107;">0</div>
            </div>
        </div>
        
        <div class="rules-grid" id="rules-container"></div>
        
        <div class="footer">
            <p>Generated by Brain-Storm Compliance System</p>
        </div>
    </div>
    
    <script>
        const report = REPORT_DATA;
        
        // Update header
        document.getElementById('timestamp').textContent = 
            `Last Updated: ${new Date(report.timestamp).toLocaleString()}`;
        
        const statusBadge = document.createElement('div');
        statusBadge.className = `status-badge status-${report.overall_status}`;
        statusBadge.textContent = `Overall Status: ${report.overall_status.toUpperCase()}`;
        document.getElementById('overall-status').appendChild(statusBadge);
        
        // Calculate stats
        const totalRules = report.rules.length;
        const passedRules = report.rules.filter(r => r.status === 'pass').length;
        const failedRules = report.rules.filter(r => r.status === 'fail').length;
        const totalViolations = report.rules.reduce((sum, r) => sum + (r.violations || 0), 0);
        
        document.getElementById('total-rules').textContent = totalRules;
        document.getElementById('passed-rules').textContent = passedRules;
        document.getElementById('failed-rules').textContent = failedRules;
        document.getElementById('total-violations').textContent = totalViolations;
        
        // Render rules
        const rulesContainer = document.getElementById('rules-container');
        report.rules.forEach(rule => {
            const card = document.createElement('div');
            card.className = `rule-card ${rule.status}`;
            
            const title = document.createElement('h3');
            title.textContent = rule.name.replace(/_/g, ' ').toUpperCase();
            
            const status = document.createElement('div');
            status.className = `rule-status ${rule.status}`;
            status.textContent = rule.status.toUpperCase();
            
            const violations = document.createElement('div');
            violations.className = 'violations';
            violations.innerHTML = `<strong>${rule.violations || 0}</strong> violations found`;
            
            card.appendChild(title);
            card.appendChild(status);
            card.appendChild(violations);
            
            rulesContainer.appendChild(card);
        });
    </script>
    
    <script>
        const REPORT_DATA = REPORT_JSON;
    </script>
</body>
</html>
EOF

# Replace placeholder with actual report data
REPORT_JSON=$(echo "$REPORT" | jq -c '.')
sed -i "s|REPORT_JSON|$REPORT_JSON|g" "$OUTPUT_FILE"

echo "✅ Dashboard generated: $OUTPUT_FILE"
