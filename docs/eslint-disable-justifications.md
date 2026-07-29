# eslint-disable Justifications

## Overview
This document tracks and justifies all `eslint-disable` exceptions in the codebase.

## Justification Guidelines

### When to Use eslint-disable
1. **Legacy Code** - Code that will be refactored later
2. **Third-party Libraries** - Code that cannot be changed
3. **Performance** - Rule would hurt performance
4. **False Positives** - ESLint rule incorrectly flags code
5. **Test Files** - Tests need to test edge cases

### How to Document
Each `eslint-disable` must include:
- **Why**: Reason for disabling
- **When**: Date added
- **Who**: Person responsible
- **Plan**: How to remove it

### Template
```typescript
/* eslint-disable-next-line rule-name -- 
 * Why: [reason for disabling]
 * When: [date]
 * Who: [person]
 * Plan: [how to remove]
 */
