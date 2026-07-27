# Database Migration CI/CD Guide

This document describes the automated database migration pipeline for Brain-Storm.

## Overview

The CI/CD pipeline automatically validates, tests, and reports on database migrations to ensure safe and reliable schema changes.

## Automated Checks

### 1. Migration Validation
- **File Structure**: Ensures all migrations have `up()` and `down()` methods
- **Naming Convention**: Validates timestamp-based naming (e.g., `1234567890123-Description.ts`)
- **Ordering**: Checks that migrations are in chronological order
- **Duplicates**: Detects duplicate timestamps

### 2. Dry-Run Testing
- Runs migrations on a test PostgreSQL database
- Verifies all migrations execute successfully
- Tests rollback functionality
- Ensures no data loss during migration

### 3. Migration Reports
- Generates comprehensive migration reports
- Lists all migration files with timestamps
- Comments on PRs with migration status
- Tracks migration history

## Workflow Triggers

The migration CI/CD pipeline runs automatically when:
- Pull requests modify files in `apps/backend/src/migrations/`
- Pull requests modify files in `apps/backend/src/entities/`
- Code is pushed to `main` branch with migration changes

## Creating a New Migration

### Step 1: Generate Migration
```bash
cd apps/backend
npm run migration:generate -- src/migrations/AddNewFeature
```

### Step 2: Review Generated Migration
```bash
cat src/migrations/1234567890123-AddNewFeature.ts
```

### Step 3: Test Locally
```bash
npm run migration:run
npm run migration:rollback
```

### Step 4: Commit and Push
```bash
git add src/migrations/
git commit -m "feat: add new feature migration"
git push
```

The CI/CD pipeline will automatically validate and test your migration.

## Migration Best Practices

### 1. One Concern Per Migration
Each migration should handle a single logical change:
```typescript
// ✅ Good: Single concern
export class AddUserEmailColumn1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn('users', new TableColumn({
      name: 'email',
      type: 'varchar',
      isUnique: true,
    }));
  }
  
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'email');
  }
}
```

### 2. Always Implement Down Method
Ensure rollback capability:
```typescript
// ✅ Good: Complete rollback
public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.dropColumn('users', 'email');
}

// ❌ Bad: Incomplete rollback
public async down(queryRunner: QueryRunner): Promise<void> {
  // Empty or incomplete
}
```

### 3. Use Transactions
Migrations automatically run in transactions for safety:
```typescript
// ✅ Good: Transactional
export class MyMigration1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // All operations are transactional
    await queryRunner.addColumn(...);
    await queryRunner.createIndex(...);
  }
}
```

### 4. Handle Data Migrations Carefully
For data migrations, include validation:
```typescript
export class MigrateUserData1234567890123 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Validate data before migration
    const count = await queryRunner.query('SELECT COUNT(*) FROM users');
    console.log(`Migrating ${count[0].count} users...`);
    
    // Perform migration
    await queryRunner.query('UPDATE users SET status = ? WHERE status IS NULL', ['active']);
  }
  
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('UPDATE users SET status = NULL WHERE status = ?', ['active']);
  }
}
```

## Troubleshooting

### Migration Validation Fails

**Issue**: "Invalid naming convention"
```
❌ Invalid naming convention: AddUserTable.ts
Expected format: TIMESTAMP-Description.ts
```

**Solution**: Rename file to include timestamp:
```bash
mv src/migrations/AddUserTable.ts src/migrations/1234567890123-AddUserTable.ts
```

### Dry-Run Test Fails

**Issue**: "Migration failed on test database"

**Solution**:
1. Check migration syntax for SQL errors
2. Verify column/table names exist
3. Test locally first:
   ```bash
   npm run migration:run
   npm run migration:rollback
   ```

### Rollback Test Fails

**Issue**: "Rollback test failed"

**Solution**: Ensure `down()` method properly reverses `up()`:
```typescript
// ✅ Correct: Mirrors up() exactly
public async down(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.dropColumn('users', 'email');
}
```

## Production Deployment

### Pre-Deployment Checklist
- [ ] All migrations pass CI/CD validation
- [ ] Dry-run tests pass on test database
- [ ] Rollback tested and verified
- [ ] Database backup created
- [ ] Deployment window scheduled
- [ ] Team notified

### Deployment Steps
1. Deploy new code with migrations
2. Run migrations on production:
   ```bash
   npm run migration:run
   ```
3. Verify application functionality
4. Monitor logs for errors
5. Keep rollback plan ready

### Rollback Procedure
If issues occur:
```bash
npm run migration:rollback
# Repeat as needed to revert multiple migrations
```

## Monitoring and Alerts

The CI/CD pipeline provides:
- ✅ Automatic validation on every PR
- ✅ Test database dry-run verification
- ✅ PR comments with migration status
- ✅ Detailed migration reports
- ✅ Rollback testing

## Related Documentation

- [TypeORM Migrations](https://typeorm.io/migrations)
- [Database Schema](./database-schema.md)
- [Deployment Guide](./deployment-guide.md)
- [Disaster Recovery](./disaster-recovery.md)
