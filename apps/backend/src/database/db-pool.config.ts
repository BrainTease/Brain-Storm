import { env } from '../config/env';
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
  max: env.dbPoolMax,
  min: env.dbPoolMin,
  acquireTimeout: env.dbAcquireTimeout,
  idleTimeout: env.dbIdleTimeout,
});

export const createDataSourceOptions = (poolConfig: PoolConfig): Partial<TypeOrmModuleOptions> => ({
  extra: {
    max: poolConfig.max,
    min: poolConfig.min,
    connectionTimeoutMillis: poolConfig.acquireTimeout,
    idleTimeoutMillis: poolConfig.idleTimeout,
  },
  maxQueryExecutionTime: 5000,
});
