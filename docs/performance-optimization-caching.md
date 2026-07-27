# Cache Invalidation & Optimization Patterns

## Overview

This document describes the caching strategy and cache invalidation patterns used across the Brain-Storm backend.

## Cache Key Conventions

Cache keys follow a hierarchical pattern to enable efficient prefix-based invalidation:

```
cache_type:resource_type:resource_id[:sub_resource]
```

Examples:
- `course:detail:uuid` - Single course details
- `course:list:page:0` - Course listing page
- `progress:user-uuid:course-uuid` - User progress per course
- `instructor:analytics:instructor-uuid:month` - Instructor monthly analytics

## Cache Strategies

| Resource | TTL | Strategy |
|----------|-----|----------|
| Course Details | 1 hour | Long-lived, invalidated on update |
| Course List | 30 minutes | Medium TTL for browsing |
| Enrollment Status | 15 minutes | Dynamic content with moderate TTL |
| User Progress | 10 minutes | Frequently changing, shorter TTL |
| Cohort Members | 5 minutes | Real-time sensitive |
| Leaderboard | 30 minutes | Aggregated, moderate staleness acceptable |
| Instructor Analytics | 1 hour | Heavy computation, long TTL |

## Cache Invalidation Events

Cache is invalidated on the following events:

### Course Updates
- `course.created` → Invalidate course list
- `course.updated` → Invalidate course detail + list
- `course.deleted` → Invalidate course detail + list

### Enrollment Changes
- `enrollment.created` → Invalidate user progress + course list
- `enrollment.updated` → Invalidate enrollment status + analytics
- `enrollment.completed` → Invalidate user progress + leaderboard + analytics

### Progress Tracking
- `progress.recorded` → Invalidate user progress + leaderboard
- `progress.updated` → Invalidate cohort members cache

## Implementation

### Using CacheInvalidationService

Invalidate specific resources:

```typescript
// Invalidate by key
await this.cacheInvalidation.invalidateByKey(`course:detail:${courseId}`);

// Invalidate by prefix (all matching patterns)
await this.cacheInvalidation.invalidateByPrefix('course:');

// Convenience methods for common resources
await this.cacheInvalidation.invalidateCourse(courseId);
await this.cacheInvalidation.invalidateUserProgress(userId);
await this.cacheInvalidation.invalidateInstructorAnalytics(instructorId);
```

### Cache Stampede Protection

Use jittered TTLs to prevent thundering herd:

```typescript
const ttl = this.cacheInvalidation.getTtlWithJitter(3600, 10); // ±10% jitter
```

## Metrics

Monitor cache performance with Prometheus:

- `cache_hits_total` - Total cache hits by key prefix
- `cache_misses_total` - Total cache misses by key prefix
- Hit ratio = hits / (hits + misses)

## Best Practices

1. **Always use prefix patterns** when invalidating related data
2. **Avoid high-cardinality keys** - use aggregation/bucketing for metrics
3. **Monitor hit ratios** - maintain >70% for frequently accessed resources
4. **Use jitter** for TTLs on heavy computation results
5. **Invalidate early** - on write operations, not expiration
6. **Document cache dependencies** - track what invalidates what

## Future Enhancements

- [ ] Distributed cache invalidation via Redis pub/sub
- [ ] Automatic cache warming for popular resources
- [ ] Cache size limits and eviction policies
- [ ] Cache versioning for blue-green deployments
