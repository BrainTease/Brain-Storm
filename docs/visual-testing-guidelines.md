# Visual Regression Testing Guidelines

## Overview
Visual regression testing detects unintended UI changes by comparing screenshots against baselines.

## Setup
```bash
npm install --save-dev @vitest/ui pixelmatch pngjs html2canvas
```

## Running Tests
```bash
npm run test:visual
```

## Creating Baselines
Baselines are auto-created on first run. Review and commit them:
```bash
git add tests/visual/baselines/
```

## Updating Baselines
When intentional UI changes occur:
```bash
rm tests/visual/baselines/*.png
npm run test:visual
git add tests/visual/baselines/
```

## CI Integration
Visual diffs are generated in `tests/visual/diffs/` and available as artifacts.

## Best Practices
- Keep baseline screenshots small and focused
- Test critical UI components only
- Review diffs carefully before updating baselines
- Commit baseline changes with UI modifications
