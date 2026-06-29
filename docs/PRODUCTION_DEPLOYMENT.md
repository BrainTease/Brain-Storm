# Production Deployment Guide

## Database Connection Pooling

### Overview
The application uses PostgreSQL connection pooling to efficiently manage database connections under load. Connection pooling reduces overhead by reusing connections instead of creating new ones for each query.

### Configuration

Set the following environment variables to configure the connection pool:

```bash
# Maximum number of connections in the pool (default: 20)
DB_POOL_MAX=20

# Minimum number of idle connections to maintain (default: 5)
DB_POOL_MIN=5

# Maximum time (ms) to wait for a connection from the pool (default: 30000)
DB_ACQUIRE_TIMEOUT=30000

# Maximum time (ms) a connection can be idle before being released (default: 10000)
DB_IDLE_TIMEOUT=10000
```

### Recommended Settings by Environment

#### Development
```bash
DB_POOL_MAX=10
DB_POOL_MIN=2
DB_ACQUIRE_TIMEOUT=30000
DB_IDLE_TIMEOUT=10000
```

#### Staging
```bash
DB_POOL_MAX=15
DB_POOL_MIN=5
DB_ACQUIRE_TIMEOUT=30000
DB_IDLE_TIMEOUT=10000
```

#### Production
```bash
DB_POOL_MAX=20
DB_POOL_MIN=10
DB_ACQUIRE_TIMEOUT=30000
DB_IDLE_TIMEOUT=10000
```

### Read Replica Setup

The application supports read-replica routing for scalability:

1. **Configure Read Replica**
   ```bash
   DATABASE_REPLICA_HOST=replica.postgres.example.com
   DATABASE_REPLICA_PORT=5432
   ```

2. **Usage in Services**
   ```typescript
   import { ReadReplicaService } from './database/read-replica.service';
   
   constructor(private readReplica: ReadReplicaService) {}
   
   async getUsers() {
     const queryBuilder = this.userRepository.createQueryBuilder('user');
     return this.readReplica.executeReadQuery(queryBuilder);
   }
   ```

### Load Testing

Test pool behavior under concurrency:

```bash
# Run load test against the API
npm run test:load

# Monitor pool metrics
curl http://localhost:3000/metrics | grep db_pool
```

### Scaling Guidance

#### Vertical Scaling (Single Database)
- **Low Load** (< 100 req/s): DB_POOL_MAX=10
- **Medium Load** (100-500 req/s): DB_POOL_MAX=20
- **High Load** (500-1000 req/s): DB_POOL_MAX=30

#### Horizontal Scaling (with Read Replicas)
1. Add read replicas for read-heavy workloads
2. Route read queries via `ReadReplicaService`
3. Keep write queries on primary database
4. Monitor replication lag

#### Connection Pool Sizing Formula
```
max_pool_size = (core_count * 2) + effective_spindle_count
```

For a 4-core server with SSD:
```
max_pool_size = (4 * 2) + 1 = 9
```

Add 20-30% buffer for production: **12-15 connections**

### Monitoring

Monitor these metrics in production:

- **Active Connections**: Should stay below DB_POOL_MAX
- **Connection Wait Time**: Should be < 100ms
- **Query Execution Time**: Should be < 100ms (flagged > 5000ms)
- **Connection Pool Exhaustion**: Monitor timeouts

### Troubleshooting

#### Connection Pool Exhausted
```
Error: TimeoutError: ResourceRequest timed out
```

**Solutions:**
1. Increase `DB_POOL_MAX`
2. Reduce `DB_ACQUIRE_TIMEOUT` to fail faster
3. Optimize slow queries
4. Add read replicas

#### Too Many Database Connections
```
Error: FATAL: sorry, too many clients already
```

**Solutions:**
1. Reduce `DB_POOL_MAX` across all instances
2. Use PgBouncer for connection pooling at database level
3. Scale horizontally with replicas

### PgBouncer Integration (Optional)

For very high concurrency, deploy PgBouncer:

```ini
[databases]
brain-storm = host=localhost port=5432 dbname=brain-storm

[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

Update app configuration:
```bash
DATABASE_HOST=pgbouncer.internal
DATABASE_PORT=6432
DB_POOL_MAX=50  # Higher since PgBouncer handles pooling
```

### Best Practices

1. **Always use connection pooling in production**
2. **Monitor connection metrics continuously**
3. **Set appropriate timeouts to fail fast**
4. **Use read replicas for read-heavy workloads**
5. **Size pools based on load testing, not guesses**
6. **Consider PgBouncer for > 500 concurrent connections**

### References

- [PostgreSQL Connection Pooling](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [TypeORM Connection Options](https://typeorm.io/data-source-options)
- [PgBouncer Documentation](https://www.pgbouncer.org/usage.html)
