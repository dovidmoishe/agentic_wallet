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
});
