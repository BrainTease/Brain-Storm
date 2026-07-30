import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface PoolConfig {
  max: number;
  min: number;
  acquireTimeout: number;
  idleTimeout: number;
}

/**
 * Returns the TypeORM connection-pool configuration.
 *
 * Issue #805: previously read raw `process.env` values here.  The canonical
 * source of truth is now `src/config/configuration.ts` (dbPool.*) which is
 * validated by `src/config/validation.schema.ts`.  Callers that have access to
 * ConfigService should read `config.get<number>('dbPool.max')` etc.
 *
 * This helper is retained for contexts where ConfigService is not yet available
 * (e.g. data-source.ts used by the TypeORM CLI), falling back to the same
 * defaults defined in the schema.
 */
export const getPoolConfig = (): PoolConfig => ({
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  min: parseInt(process.env.DB_POOL_MIN || '5', 10),
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '30000', 10),
  idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '10000', 10),
});

export const createDataSourceOptions = (
  poolConfig: PoolConfig,
): Partial<TypeOrmModuleOptions> => ({
  extra: {
    max: poolConfig.max,
    min: poolConfig.min,
    connectionTimeoutMillis: poolConfig.acquireTimeout,
    idleTimeoutMillis: poolConfig.idleTimeout,
  },
  maxQueryExecutionTime: 5000,
});
