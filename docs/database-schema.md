# Database Schema Documentation

PostgreSQL database for the Brain-Storm backend. Managed via TypeORM with explicit migrations (`synchronize: false` in all environments).

**Database:** `brain-storm` (default)  
**ORM:** TypeORM  
**Migration runner:** `npm run typeorm:run` — see [migrations.md](./migrations.md) for workflow details.

---

## Table of Contents

1. [ER Diagram](#1-er-diagram)
2. [Table Reference](#2-table-reference)
   - [users](#users)
   - [courses](#courses)
   - [course_modules](#course_modules)
   - [lessons](#lessons)
   - [enrollments](#enrollments)
   - [progress](#progress)
   - [credentials](#credentials)
   - [notifications](#notifications)
   - [reviews](#reviews)
   - [posts](#posts)
   - [replies](#replies)
   - [refresh_tokens](#refresh_tokens)
   - [password_reset_tokens](#password_reset_tokens)
   - [api_keys](#api_keys)
   - [kyc_customers](#kyc_customers)
3. [Relationship Summary](#3-relationship-summary)
4. [Migration History](#4-migration-history)
5. [Data Retention & Archival Policies](#5-data-retention--archival-policies)

---

## 1. ER Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ┌──────────────┐         ┌──────────────────┐      ┌──────────────────┐  │
│   │    users     │────┐    │     courses      │──┐   │  course_modules  │  │
│   ├──────────────┤    │    ├──────────────────┤  │   ├──────────────────┤  │
│   │ id (PK)      │    │    │ id (PK)          │  │   │ id (PK)          │  │
│   │ email        │    │    │ title            │  └──►│ courseId (FK)    │  │
│   │ passwordHash │    │    │ description      │      │ title            │  │
│   │ stellarPubKey│    │    │ level            │      │ order            │  │
│   │ role         │    │    │ durationHours    │      └────────┬─────────┘  │
│   │ isBanned     │    │    │ isPublished      │               │            │
│   │ isVerified   │    │    │ isDeleted        │               ▼            │
│   │ deletedAt    │    │    │ requiresKyc      │      ┌──────────────────┐  │
│   │ mfaEnabled   │    │    │ instructorId(FK)─┼──────┤    lessons       │  │
│   │ createdAt    │    │    │ createdAt        │      ├──────────────────┤  │
│   └──────┬───────┘    │    └──────────────────┘      │ id (PK)          │  │
│          │            │                               │ moduleId (FK)    │  │
│          │            │                               │ title            │  │
│   ┌──────▼──────────┐ │    ┌──────────────────┐      │ content          │  │
│   │  refresh_tokens │ │    │   enrollments    │      │ videoUrl         │  │
│   ├─────────────────┤ │    ├──────────────────┤      │ order            │  │
│   │ id (PK)         │ │    │ id (PK)          │      │ durationMinutes  │  │
│   │ userId (FK)     │ │    │ userId (FK)──────┼──┐   └──────────────────┘  │
│   │ tokenHash       │ │    │ courseId (FK)    │  │                         │
│   │ expiresAt       │ │    │ enrolledAt       │  │   ┌──────────────────┐  │
│   │ revoked         │ │    │ completedAt      │  │   │    progress      │  │
│   └─────────────────┘ │    └──────────────────┘  │   ├──────────────────┤  │
│                        │                          └──►│ userId (FK)      │  │
│   ┌─────────────────┐  │    ┌──────────────────┐      │ courseId (FK)    │  │
│   │  pwd_reset_tkns │  │    │  credentials     │      │ lessonId         │  │
│   ├─────────────────┤  │    ├──────────────────┤      │ progressPct      │  │
│   │ id (PK)         │  │    │ id (PK)          │      │ completedAt      │  │
│   │ userId (FK)     │  │    │ userId (FK)      │      │ txHash           │  │
│   │ tokenHash       │  │    │ courseId (FK)    │      │ updatedAt        │  │
│   │ expiresAt       │  │    │ txHash           │      └──────────────────┘  │
│   │ used            │  │    │ stellarPublicKey │                            │
│   └─────────────────┘  │    │ issuedAt         │      ┌──────────────────┐  │
│                         │    └──────────────────┘      │  notifications   │  │
│   ┌─────────────────┐   │                              ├──────────────────┤  │
│   │    api_keys     │   │    ┌──────────────────┐      │ id (PK)          │  │
│   ├─────────────────┤   │    │    reviews       │      │ userId           │  │
│   │ id (PK)         │   │    ├──────────────────┤      │ type (enum)      │  │
│   │ userId (FK)─────┼───┘    │ id (PK)          │      │ message          │  │
│   │ name            │        │ userId (FK)      │      │ isRead           │  │
│   │ keyHash         │        │ courseId (FK)    │      │ createdAt        │  │
│   │ isActive        │        │ rating           │      └──────────────────┘  │
│   │ lastUsedAt      │        │ comment          │                            │
│   └─────────────────┘        │ createdAt        │      ┌──────────────────┐  │
│                               └──────────────────┘      │  kyc_customers   │  │
│   ┌──────────────────────────────────────────┐          ├──────────────────┤  │
│   │                 posts                    │          │ id (PK)          │  │
│   ├──────────────────────────────────────────┤          │ stellarPublicKey │  │
│   │ id (PK)  courseId (FK)  userId (FK)      │          │ status           │  │
│   │ title    content        isPinned         │          │ providerId       │  │
│   │ answerReplyId           createdAt        │          └──────────────────┘  │
│   └──────────────────┬───────────────────────┘                               │
│                       │                                                       │
│   ┌───────────────────▼──────────────────────┐                               │
│   │                replies                   │                               │
│   ├──────────────────────────────────────────┤                               │
│   │ id (PK)  postId (FK)  userId (FK)        │                               │
│   │ content  isAnswer     createdAt          │                               │
│   └──────────────────────────────────────────┘                               │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

**Legend:** `(PK)` = primary key · `(FK)` = foreign key · `──►` = one-to-many

---

## 2. Table Reference

### `users`

Central identity table. Every other table that tracks user activity references this table.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `email` | varchar | NO | — | UNIQUE |
| `username` | varchar | YES | — | UNIQUE |
| `passwordHash` | varchar | NO | — | bcrypt hash |
| `avatar` | varchar | YES | — | URL to avatar image |
| `bio` | text | YES | — | |
| `stellarPublicKey` | varchar | YES | — | Stellar G-address |
| `role` | varchar | NO | `'student'` | `'student'` \| `'instructor'` \| `'admin'` |
| `isBanned` | boolean | NO | `false` | Soft-ban flag |
| `isVerified` | boolean | NO | `false` | Email verified |
| `deletedAt` | timestamp | YES | — | Soft-delete timestamp |
| `verificationToken` | varchar | YES | — | Hashed email verification token |
| `verificationTokenExpiresAt` | datetime | YES | — | |
| `mfaEnabled` | boolean | NO | `false` | TOTP MFA active |
| `mfaSecret` | varchar | YES | — | Encrypted TOTP secret |
| `createdAt` | timestamp | NO | `now()` | |

**Indexes:** `email` (unique), `username` (unique)  
**Soft-delete:** Rows are never hard-deleted. `deletedAt IS NOT NULL` means the account is deactivated. Queries should filter `WHERE "deletedAt" IS NULL` for active users.

---

### `courses`

Catalogue of learning courses. Supports soft-delete via `isDeleted`.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `title` | varchar | NO | — | |
| `description` | text | NO | — | |
| `level` | varchar | NO | `'beginner'` | `'beginner'` \| `'intermediate'` \| `'advanced'` |
| `durationHours` | int | NO | `0` | Estimated total hours |
| `isPublished` | boolean | NO | `true` | Visible to students |
| `isDeleted` | boolean | NO | `false` | Soft-delete flag |
| `requiresKyc` | boolean | NO | `false` | KYC gate for enrollment |
| `instructorId` | uuid | YES | — | FK → `users.id` ON DELETE SET NULL |
| `createdAt` | timestamp | NO | `now()` | |

**Relationships:** `instructorId` → `users` (SET NULL on user delete), `modules` → `course_modules`, `reviews` → `reviews`

---

### `course_modules`

Ordered sections within a course. Deleted when the parent course is deleted.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `courseId` | uuid | NO | — | FK → `courses.id` ON DELETE CASCADE |
| `title` | varchar | NO | — | |
| `order` | int | NO | `0` | Display order within course |
| `createdAt` | timestamp | NO | `now()` | |

---

### `lessons`

Individual content units within a module. Deleted when the parent module is deleted.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `moduleId` | uuid | NO | — | FK → `course_modules.id` ON DELETE CASCADE |
| `title` | varchar | NO | — | |
| `content` | text | NO | — | Lesson body (HTML/Markdown) |
| `videoUrl` | varchar | YES | — | Optional video embed URL |
| `order` | int | NO | `0` | Display order within module |
| `durationMinutes` | int | NO | `0` | Estimated reading/watch time |
| `createdAt` | timestamp | NO | `now()` | |

---

### `enrollments`

Records which users are enrolled in which courses. The composite unique constraint prevents duplicate enrollments.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `userId` | uuid | NO | — | FK → `users.id` ON DELETE CASCADE |
| `courseId` | uuid | NO | — | FK → `courses.id` ON DELETE CASCADE |
| `enrolledAt` | timestamp | NO | `now()` | |
| `completedAt` | timestamp | YES | — | Set when progress reaches 100% |

**Indexes:** UNIQUE (`userId`, `courseId`)

---

### `progress`

Tracks a student's current progress percentage for each enrolled course. Updated on every lesson completion. The `txHash` column links to the corresponding on-chain Analytics contract transaction.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `userId` | uuid | NO | — | FK → `users.id` ON DELETE CASCADE |
| `courseId` | uuid | NO | — | FK → `courses.id` ON DELETE CASCADE |
| `lessonId` | uuid | YES | — | Last completed lesson (no FK constraint) |
| `progressPct` | int | NO | `0` | 0–100 |
| `completedAt` | timestamp | YES | — | Set when `progressPct` reaches 100 |
| `txHash` | varchar | YES | — | Stellar transaction hash from Analytics contract |
| `updatedAt` | timestamp | NO | auto | Updated on every write |

---

### `credentials`

Issued on-chain certificates. One credential per `(userId, courseId)` pair. The `txHash` is the Stellar transaction that recorded the credential issuance.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `userId` | uuid | NO | — | FK → `users.id` ON DELETE CASCADE |
| `courseId` | uuid | NO | — | FK → `courses.id` ON DELETE CASCADE |
| `txHash` | varchar | YES | — | Stellar transaction hash |
| `stellarPublicKey` | varchar | YES | — | Recipient's Stellar address at issuance time |
| `issuedAt` | timestamp | NO | `now()` | |

---

### `notifications`

In-app notification feed per user. Not linked via FK to `users` — userId is stored as a plain column to allow notifications to survive user soft-deletes.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `userId` | uuid | NO | — | References `users.id` (no FK constraint) |
| `type` | enum | NO | — | `enrollment` \| `completion` \| `credential_issued` |
| `message` | varchar | NO | — | Human-readable message |
| `isRead` | boolean | NO | `false` | |
| `createdAt` | timestamp | NO | `now()` | |

**Indexes:** `userId` (recommended for `WHERE userId = ?` queries)

---

### `reviews`

One review per `(userId, courseId)` pair. Rating is an integer (expected range 1–5, enforced at application layer).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `userId` | uuid | NO | — | FK → `users.id` ON DELETE CASCADE |
| `courseId` | uuid | NO | — | FK → `courses.id` ON DELETE CASCADE |
| `rating` | int | NO | — | 1–5 |
| `comment` | text | YES | — | |
| `createdAt` | timestamp | NO | `now()` | |

**Indexes:** UNIQUE (`userId`, `courseId`)

---

### `posts`

Forum discussion threads scoped to a course. `answerReplyId` is set when an instructor or moderator marks a reply as the accepted answer.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `courseId` | uuid | NO | — | FK → `courses.id` ON DELETE CASCADE |
| `userId` | uuid | NO | — | FK → `users.id` ON DELETE CASCADE |
| `title` | varchar | NO | — | |
| `content` | text | NO | — | |
| `isPinned` | boolean | NO | `false` | Pinned to top of forum |
| `answerReplyId` | uuid | YES | — | Self-referencing accepted answer (no FK) |
| `createdAt` | timestamp | NO | `now()` | |

---

### `replies`

Replies to forum posts. `isAnswer` is `true` when this reply is the accepted answer (mirrors `posts.answerReplyId`).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `postId` | uuid | NO | — | FK → `posts.id` ON DELETE CASCADE |
| `userId` | uuid | NO | — | FK → `users.id` ON DELETE CASCADE |
| `content` | text | NO | — | |
| `isAnswer` | boolean | NO | `false` | |
| `createdAt` | timestamp | NO | `now()` | |

---

### `refresh_tokens`

Stores hashed refresh tokens for JWT rotation. Tokens are revoked (not deleted) on logout so that replay attacks can be detected.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `userId` | uuid | NO | — | FK → `users.id` ON DELETE CASCADE |
| `tokenHash` | varchar | NO | — | SHA-256 hash of the opaque token |
| `expiresAt` | timestamp | NO | — | |
| `revoked` | boolean | NO | `false` | Set to `true` on logout |
| `createdAt` | timestamp | NO | `now()` | |

---

### `password_reset_tokens`

Single-use tokens for the forgot-password flow. Marked `used = true` after redemption rather than deleted.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `userId` | uuid | NO | — | FK → `users.id` ON DELETE CASCADE |
| `tokenHash` | varchar | NO | — | SHA-256 hash of the emailed token |
| `expiresAt` | timestamp | NO | — | |
| `used` | boolean | NO | `false` | |
| `createdAt` | timestamp | NO | `now()` | |

---

### `api_keys`

Programmatic API access keys for integrations. The raw key is shown once at creation; only the hash is stored.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `userId` | uuid | NO | — | FK → `users.id` ON DELETE CASCADE |
| `name` | varchar | NO | — | Human label |
| `keyHash` | varchar | NO | — | UNIQUE — SHA-256 of the raw key |
| `isActive` | boolean | NO | `true` | Revoke by setting to `false` |
| `lastUsedAt` | timestamp | YES | — | Updated on each authenticated request |
| `createdAt` | timestamp | NO | `now()` | |

**Indexes:** `keyHash` (unique) — used for O(1) lookup on every API request

---

### `kyc_customers`

KYC verification status keyed by Stellar public key. Decoupled from `users` so that KYC state can be checked without a user account lookup.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` | PK |
| `stellarPublicKey` | varchar | NO | — | UNIQUE |
| `status` | varchar | NO | `'none'` | `'none'` \| `'pending'` \| `'approved'` \| `'rejected'` |
| `providerId` | varchar | YES | — | External ID from KYC provider |
| `createdAt` | timestamp | NO | `now()` | |
| `updatedAt` | timestamp | NO | auto | |

---

## 3. Relationship Summary

```
users ──< enrollments >── courses
users ──< progress    >── courses
users ──< credentials >── courses
users ──< reviews     >── courses
users ──< posts       >── courses
users ──< replies     >── posts
users ──< refresh_tokens
users ──< password_reset_tokens
users ──< api_keys
users ──< notifications
courses ──< course_modules ──< lessons
```

**Cascade behaviour:**

| Parent deleted | Child behaviour |
|---|---|
| `users` | CASCADE: enrollments, progress, credentials, reviews, posts, replies, refresh_tokens, password_reset_tokens, api_keys |
| `courses` | CASCADE: course_modules, enrollments, progress, credentials, reviews, posts |
| `course_modules` | CASCADE: lessons |
| `posts` | CASCADE: replies |
| `courses` (instructor deleted) | SET NULL: `courses.instructorId` |

---

## 4. Migration History

Migrations live in `apps/backend/src/migrations/` and are applied in timestamp order.

| Timestamp | Class | Tables Created |
|---|---|---|
| `1700000000000` | `InitialMigration` | `users`, `courses`, `notifications` |
| `1711700000000` | `AddApiKeys` | `api_keys` |
| `1711800000000` | `AddReviews` | `reviews` |
| `1711900000000` | `AddForums` | `posts`, `replies` |

> The following tables are managed by TypeORM `synchronize` during initial development and do not yet have explicit migration files: `course_modules`, `lessons`, `enrollments`, `progress`, `credentials`, `refresh_tokens`, `password_reset_tokens`, `kyc_customers`.
>
> **Action required:** Before the next production deployment, generate explicit migrations for these tables:
> ```bash
> npm run typeorm:generate -- src/migrations/AddRemainingTables
> ```

### Adding a New Migration

```bash
# 1. Modify the relevant entity
# 2. Generate
npm run typeorm:generate -- src/migrations/DescriptiveName

# 3. Review the generated file, then apply
npm run typeorm:run

# Rollback if needed
npm run typeorm:revert
```

See [migrations.md](./migrations.md) for the full workflow and production checklist.

---

## 5. Data Retention & Archival Policies

### Active Data

| Table | Retention | Notes |
|---|---|---|
| `users` | Indefinite | Soft-deleted via `deletedAt`; hard-delete only on explicit GDPR erasure request |
| `courses` | Indefinite | Soft-deleted via `isDeleted`; preserves credential/progress history |
| `course_modules` / `lessons` | Lifetime of course | Cascade-deleted with course |
| `enrollments` | Indefinite | Historical record of participation |
| `progress` | Indefinite | Source of truth for completion; backed by on-chain record |
| `credentials` | Indefinite | Legal record of certification; must never be deleted |
| `reviews` | Indefinite | Deleted only if user requests erasure |
| `posts` / `replies` | Indefinite | Moderation soft-delete recommended (add `deletedAt` column in future migration) |
| `notifications` | 90 days | Purge `WHERE "isRead" = true AND "createdAt" < NOW() - INTERVAL '90 days'` |
| `kyc_customers` | Indefinite | Regulatory requirement; status changes are audited via `updatedAt` |

### Short-Lived / Expiring Data

| Table | Retention | Cleanup Strategy |
|---|---|---|
| `refresh_tokens` | Until `expiresAt` | Scheduled job: `DELETE WHERE "expiresAt" < NOW()` — run nightly |
| `password_reset_tokens` | Until `expiresAt` or `used = true` | Scheduled job: `DELETE WHERE "expiresAt" < NOW() OR "used" = true` — run nightly |
| `api_keys` | Until revoked | No automatic expiry; `isActive = false` disables without deleting audit trail |

### Recommended Cleanup Job

Add a scheduled NestJS task (or a PostgreSQL `pg_cron` job) to purge expired tokens and old read notifications:

```sql
-- Expired auth tokens
DELETE FROM refresh_tokens        WHERE "expiresAt" < NOW();
DELETE FROM password_reset_tokens WHERE "expiresAt" < NOW() OR used = true;

-- Old read notifications (90-day window)
DELETE FROM notifications
  WHERE "isRead" = true
    AND "createdAt" < NOW() - INTERVAL '90 days';
```

### GDPR / Right to Erasure

When a user requests account deletion:

1. Hard-delete the `users` row — cascades to all linked tables automatically.
2. Anonymise `credentials` rows instead of deleting them (credentials are legal records):
   ```sql
   UPDATE credentials
   SET "stellarPublicKey" = '[redacted]'
   WHERE "userId" = $1;
   ```
3. Remove the `kyc_customers` row for the user's Stellar public key.
4. Log the erasure event in your audit log.

## 6. Indexing Strategy

### Index Design Principles

1. **Selectivity:** Index columns with high cardinality (many distinct values).
2. **Query patterns:** Index columns used in `WHERE`, `ORDER BY`, and `JOIN` conditions.
3. **Write cost:** Each index adds overhead to `INSERT`, `UPDATE`, and `DELETE` operations.
4. **Composite indexes:** Order columns by selectivity (most selective first) and query frequency.

### Current Indexes

| Table | Columns | Type | Reason |
|---|---|---|---|
| `users` | `email` | UNIQUE | Login lookups |
| `users` | `username` | UNIQUE | Profile lookups |
| `courses` | `(isPublished, isDeleted)` | Composite | Every list query filters on both |
| `courses` | `createdAt` | Single | Default sort column |
| `enrollments` | `(userId, courseId)` | UNIQUE | Prevent duplicate enrollments |
| `progress` | `(userId, courseId)` | Composite | Progress lookups by student + course |
| `reviews` | `(userId, courseId)` | UNIQUE | One review per student per course |
| `api_keys` | `keyHash` | UNIQUE | O(1) lookup on every API request |
| `kyc_customers` | `stellarPublicKey` | UNIQUE | KYC status lookups |
| `notifications` | `userId` | Single | Notification feed queries |

### Adding New Indexes

```bash
# Generate a migration
npm run typeorm:generate -- src/migrations/AddIndexOnColumn

# Review the generated migration, then apply
npm run typeorm:run
```

### Monitoring Index Usage

```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND indexname NOT IN (
    SELECT constraint_name FROM information_schema.table_constraints
  );

-- Check index size
SELECT indexname, pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## 7. Schema Versioning

### Version Tracking

The schema version is stored in a `schema_version` table:

```sql
CREATE TABLE schema_version (
  id SERIAL PRIMARY KEY,
  version INT NOT NULL,
  description VARCHAR NOT NULL,
  installed_on TIMESTAMP DEFAULT NOW(),
  execution_time INT
);
```

### Semantic Versioning

Schema versions follow `MAJOR.MINOR.PATCH`:

- **MAJOR:** Breaking changes (e.g. dropping a column, changing a constraint).
- **MINOR:** Additive changes (e.g. new table, new column with default).
- **PATCH:** Non-breaking fixes (e.g. index optimization, constraint relaxation).

### Current Version

```bash
SELECT version FROM schema_version ORDER BY installed_on DESC LIMIT 1;
```

### Backward Compatibility

All migrations must be backward-compatible with the previous version for at least one release cycle. This allows for safe rolling deployments:

1. Deploy new code that reads/writes both old and new schema.
2. Run migration.
3. Deploy code that uses only the new schema.

Example: Adding a new column with a default value is safe; dropping a column requires a deprecation period.

---

## 8. Query Patterns & Examples

### Fetch User with All Enrollments

```typescript
const user = await this.usersRepo
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.enrollments', 'enrollment')
  .leftJoinAndSelect('enrollment.course', 'course')
  .where('user.id = :id', { id: userId })
  .getOne();
```

### Leaderboard: Top 50 by BST Balance

```typescript
const leaderboard = await this.usersRepo
  .createQueryBuilder('user')
  .select('user.id')
  .addSelect('user.username')
  .addSelect('user.stellarPublicKey')
  .where('user.stellarPublicKey IS NOT NULL')
  .orderBy('user.bstBalance', 'DESC')
  .limit(50)
  .getMany();
```

### Course Completion Rate

```typescript
const stats = await this.coursesRepo
  .createQueryBuilder('course')
  .select('course.id')
  .addSelect('course.title')
  .addSelect('COUNT(enrollment.id)', 'totalEnrollments')
  .addSelect('COUNT(CASE WHEN progress.completedAt IS NOT NULL THEN 1 END)', 'completions')
  .leftJoin('course.enrollments', 'enrollment')
  .leftJoin('course.progress', 'progress')
  .groupBy('course.id')
  .getRawMany();
```

### Find Courses Requiring KYC

```typescript
const kycCourses = await this.coursesRepo.find({
  where: { requiresKyc: true, isPublished: true, isDeleted: false },
  order: { createdAt: 'DESC' },
});
```

---

## 9. Data Integrity Constraints

### Foreign Key Constraints

All foreign keys are defined with explicit cascade/set-null behavior:

```typescript
@ManyToOne(() => User, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'userId' })
user: User;
```

### Unique Constraints

Prevent duplicate records:

```typescript
@Entity()
@Unique(['userId', 'courseId'])
export class Enrollment {
  @Column() userId: string;
  @Column() courseId: string;
}
```

### Check Constraints

Enforce valid value ranges at the database level:

```sql
ALTER TABLE progress ADD CONSTRAINT check_progress_pct CHECK (progressPct >= 0 AND progressPct <= 100);
ALTER TABLE reviews ADD CONSTRAINT check_rating CHECK (rating >= 1 AND rating <= 5);
```

---

## 10. Disaster Recovery

### Backup Strategy

- **Frequency:** Daily automated backups via AWS RDS or managed PostgreSQL service.
- **Retention:** 30 days of daily backups + 1 weekly backup retained for 90 days.
- **Testing:** Restore a backup to a test database weekly to verify integrity.

### Point-in-Time Recovery

PostgreSQL WAL (Write-Ahead Logging) enables recovery to any point in time within the backup retention window:

```bash
# Restore to a specific timestamp
pg_restore --data-only --dbname=brain-storm /path/to/backup.sql
```

### Verification Queries

After a restore, verify data integrity:

```sql
-- Check row counts
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM courses;
SELECT COUNT(*) FROM enrollments;

-- Verify foreign key constraints
SELECT * FROM pg_constraint WHERE contype = 'f';

-- Check for orphaned records
SELECT * FROM enrollments WHERE courseId NOT IN (SELECT id FROM courses);
```

---

## 11. Performance Tuning

### Query Analysis

Use `EXPLAIN ANALYZE` to understand query performance:

```sql
EXPLAIN ANALYZE
SELECT * FROM courses
WHERE isPublished = true AND isDeleted = false
ORDER BY createdAt DESC
LIMIT 20;
```

Look for:
- **Seq Scan:** Full table scan — add an index.
- **Index Scan:** Good — index is being used.
- **Nested Loop:** May indicate missing index on join column.

### Vacuum & Analyze

PostgreSQL requires periodic maintenance:

```bash
# Automatic via autovacuum (enabled by default)
# Manual trigger (if needed)
VACUUM ANALYZE;
```

### Connection Pooling

The backend uses PgBouncer or TypeORM's built-in pool. Monitor pool exhaustion:

```sql
SELECT count(*) FROM pg_stat_activity;
```

If approaching the max pool size, increase `max_connections` in PostgreSQL or the pool size in TypeORM.
