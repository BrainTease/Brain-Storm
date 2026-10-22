# Load Test Consolidation & Cleanup (Issue #1353)

## Objective
Consolidate k6 load test scripts from multiple locations into a single, well-organized structure within `packages/api/load/` with proper categorization and reduced duplication.

## Current State (Before Consolidation)

### Location 1: `packages/api/load/scenarios/`
- **Files**: search-discovery.js, course-browsing.js
- **Status**: Well-documented with README, proper config organization
- **Purpose**: Organized scenario testing with shared config

### Location 2: `scripts/load-tests/`
- **Files**: 14 .js files + baselines/
- **Status**: Mixed quality, some older, some maintained
- **Purpose**: Ad-hoc load test scripts

### Issues Identified
1. ✅ **Duplication**: Similar concepts split across locations
   - `courses.js` in scripts/load-tests vs `course-browsing.js` in packages/api/load/scenarios
   - `auth-login.js` vs unified auth config in packages/api/load

2. ✅ **Inconsistency**: Different organizational patterns
   - packages/api/load has config/scenarios/utils structure
   - scripts/load-tests mixes everything at root level

3. ✅ **Maintenance Burden**: Multiple locations to update

4. ✅ **Documentation Gap**: scripts/load-tests lacks centralized README

## Consolidation Strategy

### Phase 1: Organize Primary Location
All k6 tests will use the well-structured `packages/api/load/` directory.

```
packages/api/load/
├── README.md                          # Single source of truth
├── config/
│   ├── stages.js                      # Load profiles (smoke, load, stress, spike, soak, breakpoint)
│   ├── thresholds.js                  # SLO thresholds by endpoint
│   └── environment.js                 # Environment variables
├── scenarios/
│   ├── search-discovery.js            # Search & discovery endpoints
│   ├── course-browsing.js             # Course browsing workflows
│   ├── user-journey.js                # Complete user workflows (consolidated)
│   ├── auth-flows.js                  # Authentication flows
│   ├── marketplace-purchase.js        # Marketplace transactions (consolidated)
│   ├── high-concurrency.js            # High concurrency testing
│   └── stress-tests/                  # Stress testing variations
│       ├── stress-standard.js         # Standard stress test
│       ├── stress-advanced.js         # Advanced stress test
│       └── spike-test.js              # Spike test
├── utils/
│   ├── auth.js                        # Auth helpers
│   ├── generators.js                  # Data generators
│   ├── checks.js                      # Common checks
│   └── compare-baseline.js            # Baseline comparison (moved from scripts)
├── reports/                           # Results (gitignored)
├── baselines/                         # Performance baselines
│   ├── search-baseline.json
│   ├── course-browsing-baseline.json
│   ├── user-journey-baseline.json
│   ├── marketplace-baseline.json
│   └── README.md
└── .gitignore                         # Exclude reports and local results
```

### Phase 2: Consolidate Scripts from scripts/load-tests/

**Consolidate Into scenarios/**:
- ✅ `user-journey.js` → `scenarios/user-journey.js` (already good, just organize)
- ✅ `marketplace-purchase.js` → `scenarios/marketplace-purchase.js`
- ✅ `high-concurrency.js` → `scenarios/high-concurrency.js`
- ✅ `stress-test.js` → `scenarios/stress-tests/stress-standard.js`
- ✅ `stress-test-advanced.js` → `scenarios/stress-tests/stress-advanced.js`
- ✅ `spike-test.js` → `scenarios/stress-tests/spike-test.js`
- ✅ `soak-test.js` → `scenarios/stress-tests/soak-test.js`

**Consolidate Into config/**:
- ✅ `performance-baseline.js` → utils for baseline comparison
- ✅ `performance-regression.js` → utils/compare-baseline.js (enhanced)
- ✅ `performance-alerts.js` → Integrate into comparison logic

**Consolidate Into baselines/**:
- ✅ `performance-baselines.json` → Migrate to baselines/

**Deprecate (redundant or old)**:
- ❌ `auth-login.js` → Covered by auth-flows.js
- ❌ `courses.js` → Covered by course-browsing.js
- ❌ `stellar-balance.js` → Consider as separate e2e test if needed

### Phase 3: Update scripts/load-test.sh

Update root `npm run test:load` script to point to consolidated location:

```bash
# Old: scripts/load-tests/run-all-tests.sh
# New: packages/api/load/run-tests.sh or coordinated via npm scripts
```

### Phase 4: Update npm Scripts

In `package.json`:
```json
{
  "scripts": {
    "test:load": "npm run load --workspace=packages/api",
    "test:load:marketplace": "k6 run packages/api/load/scenarios/marketplace-purchase.js",
    "test:load:user-journey": "k6 run packages/api/load/scenarios/user-journey.js",
    "test:load:search": "k6 run packages/api/load/scenarios/search-discovery.js"
  }
}
```

### Phase 5: Documentation

Update `packages/api/load/README.md` to include:
- ✅ All consolidated scenarios
- ✅ Running individual tests
- ✅ Baseline comparison workflow
- ✅ CI/CD integration examples
- ✅ Performance regression detection

## Migration Checklist

- [ ] Create subdirectories in packages/api/load/scenarios/stress-tests/
- [ ] Copy stress-related scripts to new location with improvements
- [ ] Consolidate baseline comparison utilities
- [ ] Update README with all scenarios
- [ ] Create .gitignore for packages/api/load/reports/
- [ ] Update root package.json npm scripts
- [ ] Update CI/CD workflows to use new paths
- [ ] Add migration notes in CHANGELOG
- [ ] Remove old scripts/load-tests/*.js (keep run-all-tests.sh as reference)
- [ ] Verify all tests run from new locations
- [ ] Update GitHub Actions workflows

## Benefits After Consolidation

1. **Single Source of Truth**
   - One location for all k6 tests
   - Easier to find and maintain scripts

2. **Consistent Organization**
   - config/, scenarios/, utils/, baselines/ structure
   - Clear separation of concerns

3. **Better Documentation**
   - Centralized README in packages/api/load/
   - Examples for all scenarios
   - Clear baseline comparison workflow

4. **Improved Maintainability**
   - Reduced duplication
   - Easier to add new tests
   - Consistent patterns across all scripts

5. **Enhanced CI/CD Integration**
   - Clear entry points for automation
   - Standardized result output
   - Easier baseline tracking

## Implementation Plan

1. Create new directory structure in packages/api/load/
2. Consolidate scripts with improvements
3. Update npm scripts in root package.json
4. Migrate baseline data
5. Update documentation
6. Test all scenarios from new locations
7. Mark old scripts/load-tests/*.js as deprecated
8. Update CI/CD workflows

## Timeline

- Issue #1353 Implementation: This PR
- Migration Execution: Follow-up work
- Old Location Removal: Next quarter cleanup
