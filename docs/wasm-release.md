# WASM Contract Build & Release Pipeline

## Overview
Automated pipeline for building, verifying, and releasing WASM contracts.

## Release Process

### 1. Create a Tag
```bash
# Create and push a tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
