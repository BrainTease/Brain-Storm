# Database Query Optimization Guide

This guide explains how to optimize database queries and prevent performance issues.

## Overview

The database optimization system provides:
- **Query optimization utilities** to prevent N+1 problems
- **Query caching** to reduce database load
- **Performance monitoring** to detect slow queries
- **Index analysis** to identify missing indexes

## Components

### 1. QueryOptimizer

Utility class for building optimized queries.

```typescript
import { QueryOptimizer } from '@common/database/query-optimizer';

// Eager load relations to prevent N+1
const qb = this.repo.createQueryBuilder('course');
QueryOptimizer.eagerLoadRelations(qb, ['modules', 'reviews']);

// Add pagination
QueryOptimizer.paginate(qb, 1, 20);

// Add sorting
QueryOptimizer.sort(qb, 'createdAt', 'DESC');

// Add filtering
QueryOptimizer.filter(qb, { level: 'beginner', isPublished: true });

// Select specific columns
QueryOptimizer.selectColumns(qb, ['id', 'title', 'description']);
```

### 2. Query Caching

Cache query results to reduce database load.

```typescript
import { CacheQuery, InvalidateCache } from '@common/database/query-cache.decorator';

@Injectable()
export class CoursesService {
  @CacheQuery(300, 'courses')  // Cache for 5 minutes
  async findAll(page: number, limit: number) {
    return this.repo.find({ skip: (page - 1) * limit, take: limit });
  }

  @InvalidateCache('courses:*')  // Invalidate all course caches
  async create(data: CreateCourseDto) {
    return this.repo.save(data);
  }
}
```

### 3. Performance Monitoring

Monitor database performance and detect issues.

```typescript
import { DatabasePerformanceService } from '@common/database/database-performance.service';

@Injectable()
export class MyService {
  constructor(private readonly dbPerformance: DatabasePerformanceService) {}

  async getStats() {
    // Get database statistics
    const stats = await this.dbPerformance.getDatabaseStats();
    console.log('Active connections:', stats.activeConnections);

    // Get table statistics
    const tableStats = await this.dbPerformance.getTableStats('courses');
    console.log('Row count:', tableStats.rowCount);
    console.log('Size:', tableStats.sizeInMB, 'MB');

    // Get slow queries
    const slowQueries = await this.dbPerformance.getSlowQueries(10);
    slowQueries.forEach(q => {
      console.log(`${q.query} - ${q.meanTime}ms avg`);
    });
  }
}
```

## Common Patterns

### Pattern 1: Prevent N+1 Queries

**Problem:**
```typescript
// This causes N+1 queries
const courses = await this.repo.find();
for (const course of courses) {
  course.modules = await this.modulesRepo.find({ where: { courseId: course.id } });
}
```

**Solution:**
```typescript
// Use eager loading
const qb = this.repo.createQueryBuilder('course');
QueryOptimizer.eagerLoadRelations(qb, ['modules']);
const courses = await qb.getMany();
```

### Pattern 2: Optimize Large Result Sets

**Problem:**
```typescript
// Fetches all columns and all rows
const users = await this.repo.find();
```

**Solution:**
```typescript
// Select only needed columns and paginate
const qb = this.repo.createQueryBuilder('user');
QueryOptimizer.selectColumns(qb, ['id', 'email', 'name']);
QueryOptimizer.paginate(qb, 1, 20);
const users = await qb.getMany();
```

### Pattern 3: Cache Frequently Accessed Data

**Problem:**
```typescript
// Queries database on every request
async getPopularCourses() {
  return this.repo.find({ where: { isPopular: true } });
}
```

**Solution:**
```typescript
// Cache the result
@CacheQuery(600, 'popular-courses')
async getPopularCourses() {
  return this.repo.find({ where: { isPopular: true } });
}
```

### Pattern 4: Optimize Filtering

**Problem:**
```typescript
// Inefficient filtering
const courses = await this.repo.find();
return courses.filter(c => c.level === 'beginner' && c.isPublished);
```

**Solution:**
```typescript
// Filter at database level
const qb = this.repo.createQueryBuilder('course');
QueryOptimizer.filter(qb, { level: 'beginner', isPublished: true });
const courses = await qb.getMany();
```

## Best Practices

### 1. Always Eager Load Relations

```typescript
// Bad - causes N+1 queries
const courses = await this.repo.find();

// Good - eager load relations
const qb = this.repo.createQueryBuilder('course');
QueryOptimizer.eagerLoadRelations(qb, ['modules', 'reviews', 'instructor']);
const courses = await qb.getMany();
```

### 2. Use Pagination for Large Result Sets

```typescript
// Bad - fetches all rows
const users = await this.repo.find();

// Good - paginate results
const qb = this.repo.createQueryBuilder('user');
QueryOptimizer.paginate(qb, page, limit);
const users = await qb.getMany();
```

### 3. Select Only Needed Columns

```typescript
// Bad - fetches all columns
const users = await this.repo.find();

// Good - select specific columns
const qb = this.repo.createQueryBuilder('user');
QueryOptimizer.selectColumns(qb, ['id', 'email', 'name']);
const users = await qb.getMany();
```

### 4. Cache Expensive Queries

```typescript
// Cache queries that are expensive or frequently accessed
@CacheQuery(300, 'expensive-query')
async getExpensiveData() {
  // Complex query logic
}
```

### 5. Use Indexes for Filtered Queries

```typescript
// Ensure columns used in WHERE clauses have indexes
@Entity()
export class Course {
  @Column()
  @Index()
  level: string;

  @Column()
  @Index()
  isPublished: boolean;
}
```

### 6. Monitor Query Performance

```typescript
// Regularly check for slow queries
const slowQueries = await this.dbPerformance.getSlowQueries(10);

// Analyze specific queries
const analysis = await this.dbPerformance.analyzeQuery('SELECT * FROM courses');

// Optimize tables
await this.dbPerformance.optimizeTable('courses');
```

## Query Optimization Checklist

- [ ] Use eager loading for relations
- [ ] Paginate large result sets
- [ ] Select only needed columns
- [ ] Add indexes to filtered columns
- [ ] Cache frequently accessed data
- [ ] Monitor slow queries
- [ ] Use database-level filtering
- [ ] Avoid N+1 queries
- [ ] Use connection pooling
- [ ] Regular maintenance (VACUUM, ANALYZE)

## Performance Metrics

Monitor these metrics to ensure good performance:

| Metric | Target | Warning |
|--------|--------|---------|
| Query time | < 100ms | > 500ms |
| Connection count | < 20 | > 50 |
| Cache hit ratio | > 80% | < 50% |
| Slow queries | 0 | > 5 |
| Table size | < 1GB | > 5GB |

## Troubleshooting

### Slow Queries

1. Check for N+1 queries
2. Verify indexes exist on filtered columns
3. Analyze query execution plan
4. Consider caching results

### High Connection Count

1. Check for connection leaks
2. Verify connection pooling is configured
3. Monitor active queries
4. Consider query optimization

### High Memory Usage

1. Reduce result set size with pagination
2. Select only needed columns
3. Implement query caching
4. Monitor connection pool size

## Tools

### PostgreSQL Query Analysis

```sql
-- Analyze query execution plan
EXPLAIN ANALYZE SELECT * FROM courses WHERE level = 'beginner';

-- Find slow queries
SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC;

-- Find missing indexes
SELECT schemaname, tablename, indexname FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog', 'information_schema');

-- Get table statistics
SELECT n_live_tup, pg_size_bytes(pg_total_relation_size('courses')) FROM pg_stat_user_tables WHERE relname = 'courses';
```

## References

- [TypeORM Query Builder](https://typeorm.io/select-query-builder)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Database Indexing](https://use-the-index-luke.com/)
