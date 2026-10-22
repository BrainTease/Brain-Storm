import { env } from './config/env';
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.databaseHost,
  port: env.databasePort,
  username: env.databaseUser,
  password: env.databasePassword,
  database: env.databaseName,
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
});
