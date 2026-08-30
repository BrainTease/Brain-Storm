# Unused/Orphaned API Endpoints - Issue #980

This document lists endpoints that have been identified as unused or orphaned and scheduled for removal.

This is a living document that should be updated as unused endpoints are identified through:
- Code audits
- Usage metrics analysis
- Frontend/mobile app dependency scanning
- Test coverage analysis

## Process Overview

1. **Identification**: Use endpoint-audit utility and code search to identify candidates
2. **Verification**: Confirm with frontend/mobile developers that endpoint isn't used
3. **Testing**: Remove and run full test suite
4. **Documentation**: Update CHANGELOG with removal
5. **Verification**: Deploy and monitor for any errors

## Deprecated API Versions

### /v0 API (Deprecated)
**Status**: Deprecated - migrate to /v1
**Location**: `apps/backend/src/main.ts`
**Reason**: Superseded by /v1 API with better structure
**Action**: Remove all /v0 route handlers
**Timeline**: Remove in next major version
**Priority**: Low (monitor usage, deprecate first)

## Audit and Analysis

### How to identify unused endpoints:

1. **Frontend Usage Analysis**:
   - Check `apps/frontend/src` for API calls using `fetch`, `axios`, or HTTP client
   - Look for patterns: `/api/`, `BASE_URL + '/path'`

2. **Mobile SDK Usage**:
   - Check `packages/sdk/src` for SDK methods that call backend endpoints
   - Look for HTTP method definitions and route construction

3. **Load Test References**:
   - Check `__tests__/` and `packages/api/load/` for integration tests
   - These show which endpoints are actively tested/used

### Common Unused Endpoint Patterns:

- Endpoints only used by admin dashboard that's no longer maintained
- Endpoints superseded by newer versions with same functionality
- Testing/debugging endpoints left in production code
- Legacy endpoints from previous product iterations

## Endpoints Marked for Removal

### Low Priority (Safe to Remove):
- Legacy API endpoints replaced by GraphQL queries
- Debug/diagnostics endpoints not exposed in public API
- Test-only endpoints (e.g., seed data endpoints)

### Medium Priority (Check Frontend/Mobile First):
- Admin-only endpoints with single caller
- Endpoints with no associated tests
- Endpoints not referenced in API documentation

### High Priority (High Risk):
- Endpoints used by multiple clients
- Endpoints used by critical workflows
- Endpoints with data dependencies

## Removal Checklist

Before removing any endpoint:

- [ ] Verify no tests reference it
- [ ] Confirm frontend doesn't call it
- [ ] Confirm mobile SDK doesn't use it
- [ ] Check for hardcoded references in other services
- [ ] Document in CHANGELOG
- [ ] Consider deprecation period before removal

## Implementation Notes

- Use ESLint/TypeScript compiler to find unused controller methods
- Search codebase for string references to endpoint paths
- Run full test suite after removals
- Verify API documentation is updated

## Related Issues

- #980: Remove unused/orphaned endpoints
- #977: Database indexes
- #978: Structured logging
- #979: Modularize Stellar transaction-building
