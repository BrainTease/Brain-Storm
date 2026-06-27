# Code Organization Migration Guide

## Overview

This guide helps migrate the codebase to the new improved organization structure.

## Current vs New Structure

### Current Structure
```
src/
├── auth/
├── courses/
├── users/
├── common/
├── migrations/
└── [other features mixed at root level]
```

### New Structure
```
src/
├── common/                  # Shared infrastructure
├── config/                  # Configuration
├── auth/                    # Authentication
├── features/                # All feature modules
│   ├── courses/
│   ├── users/
│   ├── enrollments/
│   └── [other features]
├── database/                # Database layer
└── test/                    # Testing utilities
```

## Migration Steps

### Phase 1: Prepare (No Breaking Changes)

1. **Create new directory structure**
   ```bash
   mkdir -p apps/backend/src/features
   mkdir -p apps/backend/src/database
   mkdir -p apps/backend/src/config
   ```

2. **Create feature directories**
   ```bash
   mkdir -p apps/backend/src/features/{courses,users,enrollments,progress,certificates}
   ```

3. **Organize common utilities**
   ```bash
   mkdir -p apps/backend/src/common/{validation,utils,decorators,filters,interceptors,pipes,sanitizers,errors,logger}
   ```

### Phase 2: Move Files (Incremental)

For each feature module:

1. **Create module structure**
   ```bash
   mkdir -p apps/backend/src/features/feature/{controllers,services,entities,dto}
   ```

2. **Move files**
   ```bash
   # Move controllers
   mv apps/backend/src/feature.controller.ts apps/backend/src/features/feature/controllers/
   
   # Move services
   mv apps/backend/src/feature.service.ts apps/backend/src/features/feature/services/
   
   # Move entities
   mv apps/backend/src/feature.entity.ts apps/backend/src/features/feature/entities/
   
   # Move DTOs
   mv apps/backend/src/feature.dto.ts apps/backend/src/features/feature/dto/
   ```

3. **Move module file**
   ```bash
   mv apps/backend/src/feature.module.ts apps/backend/src/features/feature/
   ```

### Phase 3: Update Imports

1. **Update module imports**
   ```typescript
   // Before
   import { FeatureController } from './feature.controller';
   import { FeatureService } from './feature.service';
   
   // After
   import { FeatureController } from './controllers/feature.controller';
   import { FeatureService } from './services/feature.service';
   ```

2. **Update app.module imports**
   ```typescript
   // Before
   import { FeatureModule } from './feature/feature.module';
   
   // After
   import { FeatureModule } from './features/feature/feature.module';
   ```

3. **Update cross-module imports**
   ```typescript
   // Before
   import { OtherService } from '../other/other.service';
   
   // After
   import { OtherService } from '../other/services/other.service';
   ```

### Phase 4: Update Module Exports

Ensure modules properly export services:

```typescript
// feature.module.ts
@Module({
  imports: [TypeOrmModule.forFeature([Feature])],
  controllers: [FeatureController],
  providers: [FeatureService],
  exports: [FeatureService], // Export for other modules
})
export class FeatureModule {}
```

### Phase 5: Test

1. **Run unit tests**
   ```bash
   npm run test
   ```

2. **Run integration tests**
   ```bash
   npm run test:integration
   ```

3. **Run e2e tests**
   ```bash
   npm run test:e2e
   ```

4. **Check for import errors**
   ```bash
   npm run build
   ```

### Phase 6: Update Documentation

1. Update README files
2. Update API documentation
3. Update developer guides
4. Update architecture diagrams

## Automated Migration Script

Create `scripts/migrate-structure.sh`:

```bash
#!/bin/bash

# Create new directories
mkdir -p src/features
mkdir -p src/database
mkdir -p src/config

# Move auth
mkdir -p src/auth/strategies src/auth/guards src/auth/decorators
mv src/auth/*.ts src/auth/

# Move features
for feature in courses users enrollments progress certificates credentials notifications analytics forums quizzes surveys leaderboard cohorts recommendations search moderation access-control coupons payouts kyc webhooks import-export batch reminders email cdn cache rate-limit api-usage audit health gateway metrics secrets stellar; do
  if [ -d "src/$feature" ]; then
    mkdir -p src/features/$feature/{controllers,services,entities,dto}
    mv src/$feature/* src/features/$feature/ 2>/dev/null || true
    rmdir src/$feature 2>/dev/null || true
  fi
done

# Move migrations
mkdir -p src/database/migrations
mv src/migrations/* src/database/migrations/ 2>/dev/null || true
rmdir src/migrations 2>/dev/null || true

# Move config
mkdir -p src/config
mv src/config.ts src/config/ 2>/dev/null || true

echo "Migration complete!"
```

## Rollback Plan

If issues occur:

1. **Revert git changes**
   ```bash
   git reset --hard HEAD
   ```

2. **Restore from backup**
   ```bash
   # If you have a backup
   cp -r backup/src/* src/
   ```

## Verification Checklist

- [ ] All files moved to new locations
- [ ] All imports updated
- [ ] All modules export correctly
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] E2E tests pass
- [ ] Build succeeds
- [ ] No TypeScript errors
- [ ] Documentation updated
- [ ] Team notified of changes

## Common Issues and Solutions

### Issue: Module not found errors

**Solution**: Check import paths and ensure modules are exported

```typescript
// Ensure service is exported from module
@Module({
  providers: [FeatureService],
  exports: [FeatureService], // Add this
})
export class FeatureModule {}
```

### Issue: Circular dependencies

**Solution**: Reorganize imports or use lazy loading

```typescript
// Use forwardRef for circular dependencies
@Module({
  imports: [forwardRef(() => OtherModule)],
})
export class FeatureModule {}
```

### Issue: Tests failing

**Solution**: Update test imports and mocks

```typescript
// Update test imports
import { FeatureService } from '../services/feature.service';
```

## Timeline

- **Week 1**: Prepare structure, create directories
- **Week 2**: Move core modules (auth, common)
- **Week 3**: Move feature modules (courses, users)
- **Week 4**: Move remaining modules, update imports
- **Week 5**: Testing and verification
- **Week 6**: Documentation and team training

## Communication Plan

1. **Announce changes** to team
2. **Provide migration guide** to developers
3. **Schedule training session** on new structure
4. **Create support channel** for questions
5. **Document lessons learned**

## Post-Migration

1. **Monitor for issues** in production
2. **Gather feedback** from team
3. **Update CI/CD** if needed
4. **Update IDE configurations** (ESLint, Prettier)
5. **Archive old documentation**

## References

- [NestJS Module Documentation](https://docs.nestjs.com/modules)
- [TypeScript Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
