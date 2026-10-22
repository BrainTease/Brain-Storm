#!/bin/bash
#
# Load Test Runner for Brain-Storm API
# Consolidated k6 test orchestration
#
# Usage:
#   ./packages/api/load/run-tests.sh [scenario] [profile] [api-url]
#
# Examples:
#   ./packages/api/load/run-tests.sh search-discovery load http://localhost:3000
#   ./packages/api/load/run-tests.sh user-journey smoke
#   ./packages/api/load/run-tests.sh all
#

set -e

# Default configuration
SCENARIO="${1:-all}"
PROFILE="${2:-load}"
API_URL="${3:-http://localhost:3000}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/reports/$(date +%Y%m%d_%H%M%S)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    print_error "k6 is not installed. Please install it first:"
    echo "   https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Create results directory
mkdir -p "$RESULTS_DIR"

print_header "🚀 Brain-Storm Load Tests - Consolidated Runner"
print_info "API URL: $API_URL"
print_info "Profile: $PROFILE"
print_info "Results Directory: $RESULTS_DIR"
echo ""

# Function to run a load test
run_test() {
    local test_name=$1
    local test_file=$2
    local description=$3

    echo ""
    print_header "📊 $test_name"
    print_info "$description"

    if [ ! -f "$SCRIPT_DIR/scenarios/$test_file" ]; then
        print_error "Test file not found: $SCRIPT_DIR/scenarios/$test_file"
        return 1
    fi

    local output_file="$RESULTS_DIR/${test_name}_${TIMESTAMP}.json"

    k6 run \
        --out json="$output_file" \
        --env K6_API_URL="$API_URL" \
        --env PROFILE="$PROFILE" \
        "$SCRIPT_DIR/scenarios/$test_file"

    print_success "Test completed. Results: $output_file"
}

# Run scenarios based on input
case "$SCENARIO" in
    "search-discovery")
        run_test "search-discovery" "search-discovery.js" "Search & discovery endpoints"
        ;;
    "course-browsing")
        run_test "course-browsing" "course-browsing.js" "Course browsing workflows"
        ;;
    "user-journey")
        run_test "user-journey" "user-journey.js" "Complete user journey (register → login → browse → enroll)"
        ;;
    "auth-flows")
        run_test "auth-flows" "auth-flows.js" "Authentication and authorization flows"
        ;;
    "marketplace")
        run_test "marketplace-purchase" "marketplace-purchase.js" "Marketplace purchase workflows"
        ;;
    "high-concurrency")
        run_test "high-concurrency" "high-concurrency.js" "High concurrency testing (1000+ VUs)"
        ;;
    "stress-standard")
        run_test "stress-standard" "stress-tests/stress-standard.js" "Standard stress test"
        ;;
    "stress-advanced")
        run_test "stress-advanced" "stress-tests/stress-advanced.js" "Advanced stress test"
        ;;
    "spike-test")
        run_test "spike-test" "stress-tests/spike-test.js" "Spike test - sudden load increase"
        ;;
    "soak-test")
        run_test "soak-test" "stress-tests/soak-test.js" "Soak test - sustained load"
        ;;
    "all")
        print_header "🔄 Running All Load Tests"
        run_test "search-discovery" "search-discovery.js" "Search & discovery endpoints"
        run_test "course-browsing" "course-browsing.js" "Course browsing workflows"
        run_test "user-journey" "user-journey.js" "Complete user journey"
        run_test "marketplace-purchase" "marketplace-purchase.js" "Marketplace purchase workflows"
        ;;
    *)
        print_error "Unknown scenario: $SCENARIO"
        echo ""
        echo "Available scenarios:"
        echo "  search-discovery       - Search & discovery endpoints"
        echo "  course-browsing        - Course browsing workflows"
        echo "  user-journey           - Complete user journey"
        echo "  auth-flows             - Authentication flows"
        echo "  marketplace            - Marketplace purchase workflows"
        echo "  high-concurrency       - High concurrency testing"
        echo "  stress-standard        - Standard stress test"
        echo "  stress-advanced        - Advanced stress test"
        echo "  spike-test             - Spike test"
        echo "  soak-test              - Soak test"
        echo "  all                    - Run all tests"
        echo ""
        exit 1
        ;;
esac

# Summary
echo ""
print_header "📈 Load Test Summary"
test_count=$(find "$RESULTS_DIR" -name "*.json" -type f | wc -l)
print_success "Completed $test_count test(s)"
print_info "Results: $RESULTS_DIR"
echo ""
print_info "Test files:"
find "$RESULTS_DIR" -name "*.json" -type f -exec ls -lh {} \; | awk '{print "  - " $9 " (" $5 ")"}'
echo ""
print_header "✨ Load Testing Complete!"
echo ""
