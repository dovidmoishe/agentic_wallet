import { DataSource } from 'typeorm';
import { Agent } from '../agent/entities/agent.entity.js';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [Agent],
  migrations: ['src/migrations/**/*.ts'],
  subscribers: [],
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  connectTimeoutMS: 30000,
  statementTimeoutMS: 30000,
  retryAttempts: 5,
  retryDelay: 2000,
  synchronize: false,
  logging: false,
});
