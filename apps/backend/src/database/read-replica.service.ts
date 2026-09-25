import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, SelectQueryBuilder } from 'typeorm';
import { SecretsAccessor } from '../secrets/secrets.accessor';

@Injectable()
export class ReadReplicaService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly secretsAccessor: SecretsAccessor
  ) {}

  getReadConnection(): DataSource {
    const replicaHost = this.secretsAccessor.get('DATABASE_REPLICA_HOST');
    return replicaHost ? this.dataSource : this.dataSource;
  }

  async executeReadQuery<T>(queryBuilder: SelectQueryBuilder<T>): Promise<T[]> {
    return queryBuilder.getMany();
  }

  async executeReadOneQuery<T>(queryBuilder: SelectQueryBuilder<T>): Promise<T | null> {
    return queryBuilder.getOne();
  }
}
