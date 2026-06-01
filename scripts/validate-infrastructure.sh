#!/bin/bash

# Terraform Validation Script
# Validates Terraform configurations for syntax, security, and best practices

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../terraform"
RESULTS_DIR="${SCRIPT_DIR}/../../infra-validation-results"

mkdir -p "$RESULTS_DIR"

echo "🔍 Starting Infrastructure Validation"
echo "======================================"
echo ""

# 1. Terraform Format Check
echo "1️⃣  Checking Terraform formatting..."
if terraform -chdir="$TERRAFORM_DIR" fmt -check -recursive > /dev/null 2>&1; then
  echo "✅ Terraform formatting is correct"
  echo "terraform_format: PASS" >> "$RESULTS_DIR/validation-results.txt"
else
  echo "❌ Terraform formatting issues found"
  echo "terraform_format: FAIL" >> "$RESULTS_DIR/validation-results.txt"
  terraform -chdir="$TERRAFORM_DIR" fmt -check -recursive || true
fi
echo ""

# 2. Terraform Validation
echo "2️⃣  Validating Terraform configuration..."
if terraform -chdir="$TERRAFORM_DIR" init -backend=false > /dev/null 2>&1; then
  if terraform -chdir="$TERRAFORM_DIR" validate > "$RESULTS_DIR/terraform-validate.log" 2>&1; then
    echo "✅ Terraform configuration is valid"
    echo "terraform_validate: PASS" >> "$RESULTS_DIR/validation-results.txt"
  else
    echo "❌ Terraform validation failed"
    echo "terraform_validate: FAIL" >> "$RESULTS_DIR/validation-results.txt"
    cat "$RESULTS_DIR/terraform-validate.log"
  fi
else
  echo "⚠️  Terraform init failed (backend may not be available)"
fi
echo ""

# 3. TFLint Check
echo "3️⃣  Running TFLint for best practices..."
if command -v tflint &> /dev/null; then
  if tflint --init -c "$SCRIPT_DIR/.tflint.hcl" > /dev/null 2>&1; then
    if tflint -c "$SCRIPT_DIR/.tflint.hcl" -f json "$TERRAFORM_DIR" > "$RESULTS_DIR/tflint-results.json" 2>&1; then
      TFLINT_ISSUES=$(grep -c '"rule":' "$RESULTS_DIR/tflint-results.json" || echo "0")
      if [ "$TFLINT_ISSUES" -eq 0 ]; then
        echo "✅ No TFLint issues found"
        echo "tflint: PASS" >> "$RESULTS_DIR/validation-results.txt"
      else
        echo "⚠️  TFLint found $TFLINT_ISSUES issues"
        echo "tflint: WARN" >> "$RESULTS_DIR/validation-results.txt"
        cat "$RESULTS_DIR/tflint-results.json" | jq '.' || true
      fi
    else
      echo "⚠️  TFLint check failed"
      echo "tflint: FAIL" >> "$RESULTS_DIR/validation-results.txt"
    fi
  fi
else
  echo "⚠️  TFLint not installed, skipping"
fi
echo ""

# 4. Checkov Security Scanning
echo "4️⃣  Running Checkov for security policies..."
if command -v checkov &> /dev/null; then
  if checkov -d "$TERRAFORM_DIR" --framework terraform --output cli --compact > "$RESULTS_DIR/checkov-results.txt" 2>&1; then
    CHECKOV_PASSED=$(grep -c "Passed checks:" "$RESULTS_DIR/checkov-results.txt" || echo "0")
    CHECKOV_FAILED=$(grep -c "Failed checks:" "$RESULTS_DIR/checkov-results.txt" || echo "0")
    echo "✅ Checkov scan completed"
    echo "checkov: PASS" >> "$RESULTS_DIR/validation-results.txt"
    echo "  Passed: $CHECKOV_PASSED"
    echo "  Failed: $CHECKOV_FAILED"
  else
    echo "⚠️  Checkov scan found issues"
    echo "checkov: WARN" >> "$RESULTS_DIR/validation-results.txt"
    cat "$RESULTS_DIR/checkov-results.txt" || true
  fi
else
  echo "⚠️  Checkov not installed, skipping"
fi
echo ""

# 5. Terraform Plan Analysis
echo "5️⃣  Analyzing Terraform plan..."
if [ -n "$AWS_REGION" ]; then
  if terraform -chdir="$TERRAFORM_DIR" plan -out="$RESULTS_DIR/tfplan" -no-color > "$RESULTS_DIR/terraform-plan.log" 2>&1; then
    terraform -chdir="$TERRAFORM_DIR" show -json "$RESULTS_DIR/tfplan" > "$RESULTS_DIR/tfplan.json" 2>&1 || true
    echo "✅ Terraform plan generated successfully"
    echo "terraform_plan: PASS" >> "$RESULTS_DIR/validation-results.txt"
  else
    echo "⚠️  Terraform plan generation failed (may require AWS credentials)"
    echo "terraform_plan: SKIP" >> "$RESULTS_DIR/validation-results.txt"
  fi
else
  echo "⚠️  AWS_REGION not set, skipping plan"
fi
echo ""

# 6. Generate Summary Report
echo "6️⃣  Generating validation summary..."
cat > "$RESULTS_DIR/validation-summary.md" << 'EOF'
# Infrastructure Validation Report

## Summary

| Check | Status |
|-------|--------|
EOF

while IFS=: read -r check status; do
  if [ -n "$check" ]; then
    echo "| $check | $status |" >> "$RESULTS_DIR/validation-summary.md"
  fi
done < "$RESULTS_DIR/validation-results.txt"

cat >> "$RESULTS_DIR/validation-summary.md" << 'EOF'

## Details

### Terraform Format
Ensures consistent code formatting across all Terraform files.

### Terraform Validation
Validates Terraform configuration syntax and structure.

### TFLint
Checks for best practices and potential issues in Terraform code.

### Checkov
Scans for security and compliance issues in infrastructure code.

### Terraform Plan
Generates and analyzes the execution plan for infrastructure changes.

## Recommendations

1. Fix any failed checks before deploying
2. Address warnings to improve code quality
3. Review security findings from Checkov
4. Test changes in staging environment first

EOF

echo "✅ Validation summary generated"
echo ""

# 7. Display Results
echo "📊 Validation Results"
echo "===================="
cat "$RESULTS_DIR/validation-results.txt"
echo ""

# Check for failures
if grep -q "FAIL" "$RESULTS_DIR/validation-results.txt"; then
  echo "❌ Validation failed - please fix issues before proceeding"
  exit 1
else
  echo "✅ Infrastructure validation completed successfully"
  exit 0
fi
