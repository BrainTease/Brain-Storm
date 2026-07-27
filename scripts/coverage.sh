#!/usr/bin/env bash
# Generate test coverage report for all Brain-Storm contracts.
# Requires: cargo-llvm-cov (install with: cargo install cargo-llvm-cov)
set -euo pipefail

if ! cargo llvm-cov --version &>/dev/null; then
    echo "Installing cargo-llvm-cov..."
    cargo install cargo-llvm-cov
fi

echo "Generating coverage report..."
cargo llvm-cov \
    --workspace \
    --exclude-from-report "*.wasm" \
    --html \
    --output-dir target/coverage \
    2>&1

echo ""
echo "Coverage report generated at: target/coverage/index.html"
